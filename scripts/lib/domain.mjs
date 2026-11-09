// Every command the CLI and the slash commands run. Reads are plain SQL; writes run in a
// transaction, enforce the mover's terms and the rules in docs/compliance.md, and leave an audit row.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { REPO_ROOT } from './db.mjs';
import { importMoveware } from './import.mjs';

// Fields `add` and `set` may write, per record type.
export const fields = {
  customers: ['name', 'email', 'phone', 'business', 'source', 'external_id', 'last_contact_on'],
  trucks: ['name', 'rego', 'gvm_t', 'capacity_m3', 'active'],
  crew: ['name', 'role', 'licence_class', 'licence_expires_on', 'phone', 'active'],
  jobs: ['kind', 'from_address', 'to_address', 'move_on', 'est_hours', 'packing', 'to_storage', 'storage_rate', 'source', 'carriage_terms', 'note'],
  storage_accounts: ['containers', 'location', 'standard_rate'],
  company_profile: ['name', 'jurisdiction', 'state', 'currency', 'timezone', 'hourly_rate', 'quote_valid_days', 'follow_up_days', 'enquiry_reply_days', 'deposit_pct', 'survey_over_m3', 'high_value_limit', 'max_work_hours', 'fatigue_gvm_t', 'licence_warn_days', 'invoice_due_days', 'storage_bill_ahead_days', 'storage_rate_notice_days', 'storage_review_months', 'storage_notice_days', 'storage_final_days', 'storage_sale_notice_days', 'claim_response_days'],
};
const RESOLVABLE = ['customers', 'trucks', 'crew', 'jobs', 'storage_accounts', 'invoices', 'claims', 'company_profile'];

const PIPELINE = `select j.name as job, j.customer, j.kind, j.quote_amount, j.quote_sent_on, j.quote_valid_to, j.last_follow_up_on, j.move_on,
    case when j.quote_sent_on is null then 'quote not sent'
         when j.quote_valid_to < mover_today() then 'expired, still open'
         when coalesce(j.last_follow_up_on, j.quote_sent_on) <= mover_today() - p.follow_up_days then 'follow up today'
         else 'waiting' end as stage
  from job_detail j cross join company_profile p
  where j.status = 'quoted' order by j.move_on`;

const STORAGE_ARREARS = `select s.name as account, s.customer, s.owing, s.oldest_due, s.days_overdue, s.overdue_notice_on, s.final_notice_on,
    case
      when s.final_notice_on is not null and s.final_notice_on <= mover_today() - p.storage_sale_notice_days then 'disposal allowed'
      when s.final_notice_on is not null then 'final notice given'
      when s.days_overdue >= p.storage_final_days then 'send final notice'
      when s.overdue_notice_on is not null then 'overdue notice given'
      when s.days_overdue >= p.storage_notice_days then 'send overdue notice'
      else 'late'
    end as stage,
    case when s.final_notice_on is not null then s.final_notice_on + p.storage_sale_notice_days end as disposal_from
  from storage_detail s cross join company_profile p
  where s.status = 'active' and s.days_overdue > 0
  order by s.days_overdue desc`;

export const reads = {
  profile: 'select name, jurisdiction, state, currency, hourly_rate, quote_valid_days, follow_up_days, enquiry_reply_days, deposit_pct, survey_over_m3, high_value_limit, max_work_hours, fatigue_gvm_t, licence_warn_days, invoice_due_days, storage_bill_ahead_days, storage_rate_notice_days, storage_review_months, storage_notice_days, storage_final_days, storage_sale_notice_days, claim_response_days from company_profile',
  enquiries: `select j.name as job, j.customer, j.kind, j.enquiry_on, mover_today() - j.enquiry_on as days_waiting, j.move_on, j.source, j.survey,
      case when mover_today() - j.enquiry_on >= p.enquiry_reply_days then 'reply overdue' else 'new' end as stage
    from job_detail j cross join company_profile p where j.status = 'enquiry' order by j.enquiry_on`,
  pipeline: PIPELINE,
  schedule: `select j.move_on, j.name as job, j.customer, j.kind, j.volume_m3, j.est_hours, j.crew_booked, j.trucks,
      case when j.deposit = 0 then 'none asked' when j.deposit_paid >= j.deposit then 'paid' else 'not paid' end as deposit,
      coalesce(j.insurance, 'not asked') as insurance
    from job_detail j where j.status = 'booked' and j.move_on between mover_today() and mover_today() + 14 order by j.move_on, j.name`,
  diary: `select d.work_on, d.crew, d.role, d.hours, d.jobs,
      case when d.drove_heavy and d.hours > p.max_work_hours then 'over the fatigue limit' else '' end as flag
    from crew_days d cross join company_profile p where d.work_on between mover_today() and mover_today() + 14 order by d.work_on, d.crew`,
  cube: `select j.name as job, j.customer, j.move_on, j.volume_m3, coalesce(t.capacity, 0) as truck_m3, t.capacity - j.volume_m3 as spare_m3,
      case when t.capacity is null then 'no truck allocated' when j.volume_m3 > t.capacity then 'will not fit in one load' else 'fits' end as verdict
    from job_detail j
    left join lateral (select sum(tr.capacity_m3) as capacity from (select distinct truck_id from allocations where job_id = j.id and truck_id is not null) a join trucks tr on tr.id = a.truck_id) t on true
    where j.status = 'booked' and j.move_on >= mover_today() order by j.move_on`,
  jobs: 'select name as job, customer, kind, status, move_on, volume_m3, job_total, owing from job_detail order by enquiry_on desc, name',
  customers: `select c.name, c.email, c.phone, c.source, count(j.id) as jobs, string_agg(j.status, ', ' order by j.enquiry_on) as statuses, c.last_contact_on
    from customers c left join jobs j on j.customer_id = c.id group by c.id order by c.name`,
  crew: `select c.name, c.role, c.licence_class, c.licence_expires_on, c.active,
      (select count(distinct work_on) from allocations a where a.crew_id = c.id and a.work_on between mover_today() and mover_today() + 14) as days_booked_next_14
    from crew c order by c.role, c.name`,
  trucks: 'select name, rego, gvm_t, capacity_m3, active, (select count(distinct work_on) from allocations a where a.truck_id = t.id and a.work_on between mover_today() and mover_today() + 14) as days_booked_next_14 from trucks t order by name',
  licences: `select c.name, c.role, c.licence_class, c.licence_expires_on, c.licence_expires_on - mover_today() as days_left,
      (select min(work_on) from allocations a where a.crew_id = c.id and a.driving and a.work_on >= mover_today()) as next_drive
    from crew c cross join company_profile p
    where c.active and c.role = 'driver' and (c.licence_expires_on is null or c.licence_expires_on <= mover_today() + p.licence_warn_days)
    order by c.licence_expires_on nulls first`,
  'high-value': `select j.name as job, j.customer, i.name as item, i.value, j.move_on
    from inventory i join job_detail j on j.id = i.job_id cross join company_profile p
    where i.value >= p.high_value_limit and i.declared_on is null and j.status in ('enquiry', 'quoted', 'booked') order by j.move_on`,
  variations: 'select v.name, j.name as job, j.customer, v.amount, v.agreed_on, v.agreed_how from variations v join job_detail j on j.id = v.job_id order by v.agreed_on desc',
  unbilled: `select name as job, customer, completed_on, quote_amount, variations, job_total, invoiced, job_total - invoiced as to_invoice
    from job_detail where status = 'completed' and job_total > invoiced order by completed_on`,
  debtors: `select b.name as invoice, b.customer, b.job, b.kind, b.balance, b.due_on, mover_today() - b.due_on as days_overdue
    from invoice_balances b where b.storage_id is null and not b.void and b.balance > 0 and b.due_on < mover_today() order by b.due_on`,
  storage: `select name as account, customer, containers, location, rate, standard_rate, start_on, billed_to, owing, days_overdue, status
    from storage_detail order by status, name`,
  'storage-arrears': STORAGE_ARREARS,
  'rate-review': `select s.name as account, s.customer, s.rate, s.standard_rate, s.standard_rate - s.rate as gap, coalesce(s.last_increase_on, s.start_on) as last_change,
      mover_today() + p.storage_rate_notice_days as earliest_effective
    from storage_detail s cross join company_profile p
    where s.status = 'active' and s.rate < s.standard_rate
      and coalesce(s.last_increase_on, s.start_on) <= mover_today() - make_interval(months => p.storage_review_months)
      and not exists (select 1 from rate_changes r where r.storage_id = s.id and not r.applied)
    order by s.standard_rate - s.rate desc`,
  'rate-changes': 'select r.name, s.name as account, r.old_rate, r.new_rate, r.notice_on, r.effective_on, r.effective_on - r.notice_on as notice_days, r.applied from rate_changes r join storage_accounts s on s.id = r.storage_id order by r.effective_on desc',
  claims: `select c.name, j.name as job, c.item, c.amount_claimed, c.lodged_on, mover_today() - c.lodged_on as days_open, c.responded_on, c.status, c.settled_amount,
      case when c.status = 'open' and c.responded_on is null and c.lodged_on <= mover_today() - p.claim_response_days then 'reply overdue' else '' end as flag
    from claims c join jobs j on j.id = c.job_id cross join company_profile p order by c.lodged_on desc`,
  conversion: `select coalesce(source, 'unknown') as source, count(*) as enquiries,
      count(*) filter (where quote_amount is not null) as quoted,
      count(*) filter (where status in ('booked', 'completed')) as won,
      count(*) filter (where status = 'lost') as lost,
      round(100.0 * count(*) filter (where status in ('booked', 'completed')) / nullif(count(*) filter (where status in ('booked', 'completed', 'lost')), 0)) as win_pct,
      coalesce(sum(quote_amount) filter (where status in ('booked', 'completed')), 0) as value_won
    from jobs where enquiry_on >= mover_today() - 365 group by 1 order by value_won desc, enquiries desc`,
  'lost-reasons': "select name as job, coalesce(lost_reason, 'not recorded') as reason, quote_amount, enquiry_on from jobs where status = 'lost' order by enquiry_on desc",
  estimates: `select name as job, kind, est_hours, actual_hours, actual_hours - est_hours as over_hours,
      round(100.0 * (actual_hours - est_hours) / est_hours) as over_pct
    from jobs where status = 'completed' and est_hours is not null and actual_hours is not null order by completed_on desc`,
  invoices: 'select name, customer, job, kind, amount, balance, issued_on, due_on, void from invoice_balances order by due_on desc, name',
  payments: 'select p.name, i.name as invoice, c.name as customer, p.amount, p.paid_on, p.reference from payments p join invoices i on i.id = p.invoice_id join customers c on c.id = i.customer_id order by p.paid_on desc',
  notices: 'select n.name, s.name as account, n.kind, n.given_on, n.method, n.amount_owing from notices n join storage_accounts s on s.id = n.storage_id order by n.given_on desc',
  activity: 'select c.name as customer, j.name as job, a.happened_on, a.note from activity a join customers c on c.id = a.customer_id left join jobs j on j.id = a.job_id order by a.happened_on desc, a.created_at desc',
  audit: 'select name, record_id, detail, created_at from audit order by created_at desc',
};

const ACTIONS = ['customer', 'job', 'attention', 'compliance', 'weekly-review', 'enquiry', 'survey', 'item', 'declare', 'quote', 'follow-up', 'accept', 'lose', 'cancel', 'insurance', 'consent', 'variation', 'allocate', 'complete', 'invoice', 'payment', 'store', 'storage-run', 'raise-rate', 'storage-notice', 'store-out', 'dispose', 'claim', 'close-claim', 'log', 'add', 'set', 'draft-quote', 'draft-follow-up', 'draft-reminder', 'draft-storage-notice', 'import', 'export', 'help'];
export const commands = [...Object.keys(reads), ...ACTIONS];

// ------------------------------------------------------------------ helpers

export async function resolve(db, type, q) {
  if (!q) throw Error(`Supply a ${type.replace(/_/g, ' ').replace(/s$/, '')} name or ID`);
  if (!RESOLVABLE.includes(type)) throw Error(`Unknown record type ${type}`);
  const rows = await db.query(`select * from ${type} where id::text ilike $1 or name ilike $2 order by name`, [q + '%', '%' + q + '%']);
  const exact = rows.filter((r) => r.name.toLowerCase() === q.toLowerCase() || r.id === q);
  if (exact.length === 1) return exact[0];
  if (rows.length !== 1) throw Error(rows.length ? `Ambiguous ${type.replace(/_/g, ' ')}, pick one:\n${rows.map((r) => r.id + '  ' + r.name).join('\n')}` : `No ${type.replace(/_/g, ' ')} matched "${q}"`);
  return rows[0];
}
// A job by its number ("MOV-1007", "1007") or the customer's name. An open job wins over closed
// ones for the same customer; anything still ambiguous lists the candidates.
export async function job(db, q) {
  if (!q) throw Error('Supply a job number or customer');
  const rows = await db.query(`select * from job_detail where id::text ilike $1 or name ilike $2 or customer ilike $2 order by name`, [q + '%', '%' + q + '%']);
  const exact = rows.filter((r) => r.name.toLowerCase() === q.toLowerCase());
  if (exact.length === 1) return exact[0];
  const open = rows.filter((r) => ['enquiry', 'quoted', 'booked'].includes(r.status));
  const pickFrom = rows.length > 1 && open.length === 1 ? open : rows;
  if (pickFrom.length !== 1) throw Error(pickFrom.length ? `Ambiguous job, pick one:\n${pickFrom.map((r) => `${r.name}  ${r.customer} (${r.status})`).join('\n')}` : `No job matched "${q}"`);
  return pickFrom[0];
}
// A storage account by number ("ST-204") or customer name.
async function account(db, q) {
  if (!q) throw Error('Supply a storage account or customer');
  const rows = await db.query(`select * from storage_detail where id::text ilike $1 or name ilike $2 or customer ilike $2 order by name`, [q + '%', '%' + q + '%']);
  const exact = rows.filter((r) => r.name.toLowerCase() === q.toLowerCase());
  if (exact.length === 1) return exact[0];
  const live = rows.filter((r) => r.status === 'active');
  const pickFrom = rows.length > 1 && live.length === 1 ? live : rows;
  if (pickFrom.length !== 1) throw Error(pickFrom.length ? `Ambiguous storage account, pick one:\n${pickFrom.map((r) => `${r.name}  ${r.customer} (${r.status})`).join('\n')}` : `No storage account matched "${q}"`);
  return pickFrom[0];
}
export async function transaction(db, fn) {
  await db.exec('BEGIN');
  try { const out = await fn(); await db.exec('COMMIT'); return out; } catch (e) { await db.exec('ROLLBACK'); throw e; }
}
async function audit(db, name, recordId, detail) {
  await db.query('insert into audit (name, record_id, detail) values ($1, $2, $3)', [name, recordId, JSON.stringify(detail)]);
}
function date(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '') || new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) !== s) throw Error(`Use a valid YYYY-MM-DD date, not "${s}"`);
  return s;
}
function money(s, what = 'amount') {
  if (!/^\d+(\.\d{1,2})?$/.test(String(s)) || Number(s) <= 0) throw Error(`Use a positive ${what} with at most two decimals, not "${s}"`);
  return String(s);
}
function number(s, what) {
  if (!/^\d+(\.\d+)?$/.test(String(s ?? '')) || Number(s) <= 0) throw Error(`Use a positive number for ${what}, not "${s}"`);
  return String(s);
}
async function profile(db) {
  const [p] = await db.query('select * from company_profile');
  if (!p) throw Error('No company profile. Add one: add company_profile {"name":"Your Removals"}');
  return p;
}
async function today(db) { return (await db.query('select mover_today()::text as d'))[0].d; }
async function nextName(db, table, prefix, start) {
  const [r] = await db.query(`select coalesce(max(substring(name from ${prefix.length + 1})::int) filter (where name ~ '^${prefix}[0-9]+$'), ${start}) + 1 as n from ${table}`);
  return prefix + r.n;
}
function draftFile(kind, id, body) {
  const dir = path.join(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${kind}-${String(id).slice(0, 8)}-${randomUUID().slice(0, 8)}.md`);
  writeFileSync(file, body + '\n');
  return [{ file }];
}
const day = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : String(v).slice(0, 10));
const first = (name) => (/(pty|ltd|limited|trust|co\b)/i.test(name) ? name : name.split(' ')[0]);
const cur = (n) => '$' + Number(n).toFixed(2);
const KINDS = ['local', 'country', 'interstate', 'international', 'office', 'storage'];

// ------------------------------------------------------------------ run

export async function run(db, cmd, args = [], opts = {}) {
  if (cmd === 'help') return commands.map((command) => ({ command }));
  if (reads[cmd]) return db.query(reads[cmd]);

  if (cmd === 'customer') {
    const c = await resolve(db, 'customers', args[0]);
    return {
      customer: c,
      jobs: await db.query('select name, kind, status, move_on, job_total, owing from job_detail where customer_id = $1 order by enquiry_on desc', [c.id]),
      storage: await db.query('select name, containers, rate, billed_to, owing, status from storage_detail where customer_id = $1 order by start_on desc', [c.id]),
      invoices: await db.query('select name, job, kind, amount, balance, due_on, void from invoice_balances where customer_id = $1 order by due_on desc limit 12', [c.id]),
      activity: await db.query('select happened_on, note from activity where customer_id = $1 order by happened_on desc', [c.id]),
    };
  }
  if (cmd === 'job') {
    const j = await job(db, args[0]);
    return {
      job: j,
      inventory: await db.query('select room, name, qty, m3_each, qty * m3_each as m3, value, declared_on from inventory where job_id = $1 order by room, name', [j.id]),
      variations: await db.query('select name, amount, agreed_on, agreed_how from variations where job_id = $1 order by agreed_on', [j.id]),
      crew: await db.query('select a.work_on, c.name as crew, c.role, t.name as truck, a.hours, a.driving from allocations a join crew c on c.id = a.crew_id left join trucks t on t.id = a.truck_id where a.job_id = $1 order by a.work_on, c.name', [j.id]),
      invoices: await db.query('select name, kind, amount, balance, due_on from invoice_balances where job_id = $1 and not void order by due_on', [j.id]),
      claims: await db.query('select name, item, amount_claimed, status from claims where job_id = $1', [j.id]),
    };
  }
  if (cmd === 'attention') return attention(db);
  if (cmd === 'compliance') return compliance(db);
  if (cmd === 'weekly-review') {
    return {
      'moves this fortnight': await run(db, 'schedule'),
      'quotes to chase': (await run(db, 'pipeline')).filter((r) => r.stage !== 'waiting'),
      'unanswered enquiries': (await run(db, 'enquiries')).filter((r) => r.stage === 'reply overdue'),
      'money owed': await run(db, 'debtors'),
      'not invoiced': await run(db, 'unbilled'),
      'storage arrears': await run(db, 'storage-arrears'),
      'win rate by source': await run(db, 'conversion'),
    };
  }
  if (cmd === 'import') {
    const [kind, file] = args;
    if (kind !== 'moveware' || !file) throw Error('import moveware <job-list.csv> [--dry-run] [--date-order=DMY|MDY]');
    return importMoveware(db, file, opts);
  }
  if (cmd === 'export') {
    if (!args[0]) throw Error('export <file.json>');
    const out = { format: 'removals-v1', exported_at: new Date().toISOString() };
    await transaction(db, async () => {
      for (const t of ['company_profile', 'customers', 'trucks', 'crew', 'jobs', 'inventory', 'variations', 'allocations', 'storage_accounts', 'rate_changes', 'invoices', 'payments', 'notices', 'claims', 'activity', 'audit']) {
        out[t] = await db.query(`select * from ${t} order by created_at, id`);
      }
    });
    writeFileSync(args[0], JSON.stringify(out, null, 2));
    return [{ file: path.resolve(args[0]), records: Object.values(out).filter(Array.isArray).reduce((n, a) => n + a.length, 0) }];
  }
  if (cmd.startsWith('draft-')) return draft(db, cmd, args);

  return transaction(db, async () => {
    const rows = await act(db, cmd, args, opts);
    await audit(db, cmd, rows[0]?.id || null, { arguments: args, override: opts.override || undefined });
    return rows;
  });
}

async function act(db, cmd, args, opts) {
  const p = await profile(db);
  if (cmd === 'enquiry') {
    const [who, kind, moveOn] = args;
    if (!who || !KINDS.includes(kind) || !moveOn) throw Error(`enquiry "<customer>" <${KINDS.join('|')}> <move date YYYY-MM-DD> [--from= --to= --email= --phone= --source=]`);
    date(moveOn);
    let [c] = await db.query('select * from customers where lower(name) = lower($1)', [who]);
    if (!c) [c] = await db.query('insert into customers (name, email, phone, source, business, last_contact_on) values ($1, $2, $3, $4, $5, mover_today()) returning *', [who, opts.email || null, opts.phone || null, opts.source || null, /\b(pty|ltd|limited|trust)\b/i.test(who)]);
    const rows = await db.query("insert into jobs (name, customer_id, kind, from_address, to_address, move_on, source, to_storage) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, name, kind, move_on, status",
      [await nextName(db, 'jobs', 'MOV-', 1000), c.id, kind, opts.from || null, opts.to || null, moveOn, opts.source || c.source, kind === 'storage']);
    return rows;
  }
  if (cmd === 'survey') {
    const j = await job(db, args[0]);
    if (!['video', 'in-home'].includes(args[1])) throw Error('survey <job> <video|in-home> [YYYY-MM-DD]');
    if (!['enquiry', 'quoted'].includes(j.status)) throw Error(`${j.name} is ${j.status}`);
    return db.query('update jobs set survey = $1, survey_on = coalesce($2::date, mover_today()) where id = $3 returning id, name, survey, survey_on', [args[1], args[2] ? date(args[2]) : null, j.id]);
  }
  if (cmd === 'item') {
    const j = await job(db, args[0]);
    const name = args[1];
    if (!name) throw Error('item <job> "<item>" <cubic metres each> [--qty=1] [--room=] [--value=]');
    number(args[2], 'cubic metres');
    if (['completed', 'cancelled', 'lost'].includes(j.status)) throw Error(`${j.name} is ${j.status}`);
    const qty = opts.qty ? Number(number(opts.qty, 'qty')) : 1;
    const rows = await db.query('insert into inventory (name, job_id, room, qty, m3_each, value) values ($1, $2, $3, $4, $5, $6) returning id, name, qty, m3_each, value', [name, j.id, opts.room || null, qty, args[2], opts.value ? money(opts.value, 'value') : null]);
    const [v] = await db.query('select volume_m3 from job_detail where id = $1', [j.id]);
    rows[0].job_volume_m3 = v.volume_m3;
    if (opts.value && Number(opts.value) >= Number(p.high_value_limit)) rows[0].note = `Worth ${cur(opts.value)}: get it declared in writing, then run declare "${j.name}" "${name}"`;
    return rows;
  }
  if (cmd === 'declare') {
    const j = await job(db, args[0]);
    const items = await db.query('select * from inventory where job_id = $1 and name ilike $2', [j.id, '%' + (args[1] || '') + '%']);
    if (!args[1] || items.length !== 1) throw Error(items.length ? `Ambiguous item, pick one: ${items.map((i) => i.name).join(', ')}` : 'declare <job> "<item>"');
    return db.query('update inventory set declared_on = mover_today() where id = $1 returning id, name, value, declared_on', [items[0].id]);
  }
  if (cmd === 'quote') {
    const j = await job(db, args[0]);
    if (!['enquiry', 'quoted'].includes(j.status)) throw Error(`${j.name} is ${j.status}. Quote enquiries, or re-quote open quotes.`);
    const hours = opts.hours ? number(opts.hours, 'hours') : j.est_hours;
    if (!args[1] && !hours) throw Error(`${j.name} has no estimated hours. quote <job> [amount] --hours=<n>`);
    const amount = args[1] ? money(args[1]) : (Math.round(Number(hours) * Number(p.hourly_rate) * 100) / 100).toFixed(2);
    const storageRate = opts['storage-rate'] ? money(opts['storage-rate'], 'storage rate') : j.storage_rate;
    const rows = await db.query("update jobs set status = 'quoted', est_hours = coalesce($1, est_hours), quote_amount = $2, quote_sent_on = mover_today(), quote_valid_to = mover_today() + $3::int, storage_rate = $4 where id = $5 returning id, name, quote_amount, quote_sent_on, quote_valid_to",
      [opts.hours || null, amount, p.quote_valid_days, storageRate, j.id]);
    const notes = [];
    if (Number(j.volume_m3) > Number(p.survey_over_m3) && j.survey === 'none') notes.push(`${j.volume_m3} m3 with no survey: book a video or in-home survey`);
    if (!Number(j.items)) notes.push('no inventory: the quote is not based on a list of goods');
    if (j.to_storage && !storageRate) notes.push('goes into storage but no storage rate is quoted (--storage-rate=)');
    if (notes.length) rows[0].note = notes.join('; ');
    return rows;
  }
  if (cmd === 'follow-up') {
    const j = await job(db, args[0]);
    const note = args.slice(1).join(' ').trim();
    if (!note) throw Error('follow-up <job> <what was said>');
    if (j.status !== 'quoted') throw Error(`${j.name} is ${j.status}, not quoted`);
    await db.query('update jobs set last_follow_up_on = mover_today() where id = $1', [j.id]);
    await db.query('update customers set last_contact_on = mover_today() where id = $1', [j.customer_id]);
    return db.query('insert into activity (name, customer_id, job_id, note) values ($1, $2, $3, $4) returning id, name, happened_on, note', ['Follow-up ' + j.name, j.customer_id, j.id, note]);
  }
  if (cmd === 'accept') {
    const j = await job(db, args[0]);
    if (j.status !== 'quoted') throw Error(`${j.name} is ${j.status}. Only a quoted job can be booked.`);
    if (!j.quote_sent_on && !opts.override) throw Error(`${j.name} has no written quote sent. Send it (quote, then draft-quote) or pass --override="reason".`);
    if (day(j.quote_valid_to) < await today(db) && !opts.override) throw Error(`The quote for ${j.name} expired on ${day(j.quote_valid_to)}. Re-quote, or pass --override="reason".`);
    if (!j.move_on) throw Error(`${j.name} has no move date: set jobs ${j.name} {"move_on":"YYYY-MM-DD"}`);
    const deposit = (Math.round(Number(j.quote_amount) * Number(p.deposit_pct)) / 100).toFixed(2);
    const rows = await db.query("update jobs set status = 'booked', accepted_on = mover_today(), deposit = $1 where id = $2 returning id, name, status, move_on, deposit", [deposit, j.id]);
    if (Number(deposit) > 0) {
      const [inv] = await db.query("insert into invoices (name, customer_id, job_id, kind, amount, currency, due_on) values ($1, $2, $3, 'deposit', $4, $5, least(mover_today() + $6::int, $7::date)) returning name, due_on",
        [await nextName(db, 'invoices', 'INV-', 1000), j.customer_id, j.id, deposit, p.currency, p.invoice_due_days, j.move_on]);
      rows[0].deposit_invoice = inv.name;
    }
    const notes = [];
    if (!j.insurance) notes.push('ask about transit insurance: insurance <job> taken|declined');
    if (Number(j.undeclared_high_value)) notes.push(`${j.undeclared_high_value} high-value item(s) not declared in writing`);
    if (notes.length) rows[0].note = notes.join('; ');
    return rows;
  }
  if (cmd === 'lose' || cmd === 'cancel') {
    const j = await job(db, args[0]);
    const reason = args.slice(1).join(' ').trim();
    if (!reason) throw Error(`${cmd} <job> <reason>`);
    const allowed = cmd === 'lose' ? ['enquiry', 'quoted'] : ['booked'];
    if (!allowed.includes(j.status)) throw Error(`${j.name} is ${j.status}. ${cmd === 'lose' ? 'A booked job is cancelled, not lost.' : 'Only a booked job is cancelled.'}`);
    const rows = await db.query('update jobs set status = $1, lost_reason = $2 where id = $3 returning id, name, status, lost_reason', [cmd === 'lose' ? 'lost' : 'cancelled', reason, j.id]);
    if (cmd === 'cancel') {
      const released = await db.query('delete from allocations where job_id = $1 and work_on >= mover_today() returning id', [j.id]);
      rows[0].crew_released = released.length;
      if (Number(j.deposit_paid) > 0) rows[0].note = `${cur(j.deposit_paid)} deposit paid: refund or keep it as your terms say`;
    }
    return rows;
  }
  if (cmd === 'insurance') {
    const j = await job(db, args[0]);
    if (!['taken', 'declined'].includes(args[1])) throw Error('insurance <job> taken|declined [--value=<insured value>]');
    if (args[1] === 'taken' && !opts.value) throw Error('Insurance taken needs the insured value: --value=<amount>');
    return db.query('update jobs set insurance = $1, insured_value = $2 where id = $3 returning id, name, insurance, insured_value', [args[1], args[1] === 'taken' ? money(opts.value, 'value') : null, j.id]);
  }
  if (cmd === 'consent') {
    const j = await job(db, args[0]);
    const sub = args.slice(1).join(' ').trim() || j.subcontractor;
    if (!sub) throw Error('consent <job> <subcontractor name>');
    return db.query('update jobs set subcontractor = $1, sub_consent_on = mover_today() where id = $2 returning id, name, subcontractor, sub_consent_on', [sub, j.id]);
  }
  if (cmd === 'variation') {
    const j = await job(db, args[0]);
    if (!['booked', 'completed'].includes(j.status)) throw Error(`${j.name} is ${j.status}. Change the quote instead.`);
    money(args[1]);
    const what = args.slice(2).join(' ').trim();
    if (!what) throw Error('variation <job> <amount> <what changed> [--how=email|signed|sms|verbal]');
    const how = opts.how || 'verbal';
    if (!['email', 'signed', 'sms', 'verbal'].includes(how)) throw Error('--how is email, signed, sms or verbal');
    const rows = await db.query('insert into variations (name, job_id, amount, agreed_on, agreed_how) values ($1, $2, $3, mover_today(), $4) returning id, name, amount, agreed_how', [what, j.id, args[1], how]);
    if (how === 'verbal') rows[0].note = 'Agreed verbally only: confirm the new price in writing before you invoice it';
    return rows;
  }
  if (cmd === 'allocate') return allocate(db, p, args, opts);
  if (cmd === 'complete') {
    const j = await job(db, args[0]);
    if (j.status !== 'booked') throw Error(`${j.name} is ${j.status}, not booked`);
    number(args[1], 'actual hours');
    const rows = await db.query("update jobs set status = 'completed', completed_on = mover_today(), actual_hours = $1 where id = $2 returning id, name, status, est_hours, actual_hours", [args[1], j.id]);
    rows[0].to_invoice = (Number(j.job_total) - Number(j.invoiced)).toFixed(2);
    if (j.est_hours && Number(args[1]) > Number(j.est_hours)) rows[0].note = `${(Number(args[1]) - Number(j.est_hours)).toFixed(2)} hours over the estimate: add a variation if your terms let you charge it`;
    return rows;
  }
  if (cmd === 'invoice') {
    const j = await job(db, args[0]);
    if (j.status !== 'completed') throw Error(`${j.name} is ${j.status}. Invoice the balance once the move is done.`);
    const due = Number(j.job_total) - Number(j.invoiced);
    if (!(due > 0)) throw Error(`${j.name} is fully invoiced`);
    const [verbal] = await db.query("select count(*)::int as n from variations where job_id = $1 and agreed_how = 'verbal'", [j.id]);
    if (verbal.n && !opts.override) throw Error(`${j.name} has ${verbal.n} variation(s) agreed verbally only. Confirm in writing (set the variation), or pass --override="reason".`);
    return db.query("insert into invoices (name, customer_id, job_id, kind, amount, currency, due_on) values ($1, $2, $3, 'move', $4, $5, mover_today() + $6::int) returning id, name, amount, due_on",
      [await nextName(db, 'invoices', 'INV-', 1000), j.customer_id, j.id, due.toFixed(2), p.currency, p.invoice_due_days]);
  }
  if (cmd === 'payment') {
    const inv = await resolve(db, 'invoices', args[0]);
    money(args[1]);
    if (!args[2]?.trim()) throw Error('payment <invoice> <amount> <bank reference>');
    const [b] = await db.query('select * from invoice_balances where id = $1', [inv.id]);
    if (b.void || Number(args[1]) > Number(b.balance)) throw Error(`Payment exceeds the ${cur(b.balance)} left on ${b.name}, or the invoice is void`);
    return db.query('insert into payments (name, invoice_id, amount, reference) values ($1, $2, $3, $4) returning id, name, amount, paid_on', ['Receipt ' + args[2], inv.id, args[1], args[2]]);
  }
  if (cmd === 'store') {
    const j = await job(db, args[0]);
    const containers = number(args[1], 'containers');
    const rate = args[2] ? money(args[2], 'monthly rate') : j.storage_rate;
    if (!rate) throw Error('store <job> <containers> <monthly rate> [--location=] [--standard=]');
    if (!['booked', 'completed'].includes(j.status)) throw Error(`${j.name} is ${j.status}`);
    const [existing] = await db.query("select name from storage_accounts where job_id = $1 and status = 'active'", [j.id]);
    if (existing) throw Error(`${j.name} already has storage account ${existing.name}`);
    return db.query("insert into storage_accounts (name, customer_id, job_id, containers, location, rate, standard_rate, start_on, billed_to) values ($1, $2, $3, $4, $5, $6, $7, mover_today(), mover_today() - 1) returning id, name, containers, rate, start_on",
      [await nextName(db, 'storage_accounts', 'ST-', 200), j.customer_id, j.id, containers, opts.location || null, rate, opts.standard ? money(opts.standard, 'standard rate') : rate]);
  }
  if (cmd === 'storage-run') return storageRun(db, p);
  if (cmd === 'raise-rate') {
    const s = await account(db, args[0]);
    if (s.status !== 'active') throw Error(`${s.name} is ${s.status}`);
    money(args[1], 'rate');
    if (Number(args[1]) === Number(s.rate)) throw Error(`${s.name} already pays ${cur(s.rate)}`);
    const [pending] = await db.query('select effective_on from rate_changes where storage_id = $1 and not applied', [s.id]);
    if (pending) throw Error(`${s.name} already has a change effective ${day(pending.effective_on)}`);
    const [d] = await db.query('select coalesce($1::date, mover_today() + $2::int) as effective_on, coalesce($1::date, mover_today() + $2::int) - mover_today() as days', [args[2] ? date(args[2]) : null, p.storage_rate_notice_days]);
    if (Number(args[1]) > Number(s.rate) && d.days < p.storage_rate_notice_days && !opts.override) throw Error(`A storage rate rise needs ${p.storage_rate_notice_days} days' written notice: effective ${day(d.effective_on)} gives ${d.days}.`);
    return db.query('insert into rate_changes (name, storage_id, old_rate, new_rate, notice_on, effective_on) values ($1, $2, $3, $4, mover_today(), $5) returning id, name, old_rate, new_rate, notice_on, effective_on', [`${s.name} ${Number(args[1]) > Number(s.rate) ? 'rise' : 'change'}`, s.id, s.rate, args[1], day(d.effective_on)]);
  }
  if (cmd === 'storage-notice') {
    const s = await account(db, args[0]);
    const kind = args[1], method = args[2] || 'email';
    if (!['overdue', 'final'].includes(kind) || !['email', 'post', 'sms', 'hand'].includes(method)) throw Error('storage-notice <account> overdue|final [email|post|sms|hand]');
    if (!(s.days_overdue > 0)) throw Error(`${s.name} has nothing overdue`);
    if (kind === 'final' && !s.overdue_notice_on && !opts.override) throw Error(`${s.name} has had no overdue notice. Give that first, or pass --override="reason".`);
    if (kind === 'final' && s.days_overdue < p.storage_final_days && !opts.override) throw Error(`${s.name} is ${s.days_overdue} days overdue. The final notice goes from ${p.storage_final_days} days, or pass --override="reason".`);
    const rows = await db.query('insert into notices (name, storage_id, kind, given_on, method, amount_owing) values ($1, $2, $3, mover_today(), $4, $5) returning id, name, kind, given_on, method, amount_owing', [`${kind === 'final' ? 'Final' : 'Overdue'} notice ${s.customer}`, s.id, kind, method, s.owing]);
    if (kind === 'final') rows[0].disposal_from = day((await db.query('select (mover_today() + $1::int)::text as d', [p.storage_sale_notice_days]))[0].d);
    return rows;
  }
  if (cmd === 'store-out') {
    const s = await account(db, args[0]);
    if (s.status !== 'active') throw Error(`${s.name} is ${s.status}`);
    const rows = await db.query("update storage_accounts set status = 'ended', end_on = mover_today() where id = $1 returning id, name, status, end_on, billed_to", [s.id]);
    const notes = [];
    if (Number(s.owing) > 0) notes.push(`still owes ${cur(s.owing)}: collect before the goods leave if your terms allow`);
    if (day(s.billed_to) > await today(db)) notes.push(`billed to ${day(s.billed_to)}: credit the unused days if your terms say so`);
    if (notes.length) rows[0].note = notes.join('; ');
    return rows;
  }
  if (cmd === 'dispose') {
    const s = await account(db, args[0]);
    if (s.status !== 'active') throw Error(`${s.name} is ${s.status}`);
    if (!s.final_notice_on) throw Error(`${s.name} has had no final notice. Nothing is sold or disposed of without one.`);
    const [d] = await db.query('select mover_today() - $1::date as days', [s.final_notice_on]);
    if (d.days < p.storage_sale_notice_days && !opts.override) throw Error(`The final notice went ${d.days} days ago. Disposal is allowed from ${p.storage_sale_notice_days} days, or pass --override="reason after legal advice".`);
    const rows = await db.query("update storage_accounts set status = 'disposed', disposed_on = mover_today(), end_on = mover_today() where id = $1 returning id, name, status, disposed_on", [s.id]);
    rows[0].note = 'Record what was sold or disposed of, the proceeds and any surplus owed back, with log';
    return rows;
  }
  if (cmd === 'claim') {
    const j = await job(db, args[0]);
    money(args[1]);
    const item = args.slice(2).join(' ').trim();
    if (!item) throw Error('claim <job> <amount claimed> <item and damage>');
    return db.query('insert into claims (name, job_id, item, amount_claimed) values ($1, $2, $3, $4) returning id, name, amount_claimed, lodged_on', [`${j.customer}: ${item}`.slice(0, 120), j.id, item, args[1]]);
  }
  if (cmd === 'close-claim') {
    const c = await resolve(db, 'claims', args[0]);
    const status = args[1];
    if (c.status !== 'open') throw Error(`${c.name} is already ${c.status}`);
    if (!['settled', 'declined', 'replied'].includes(status)) throw Error('close-claim <claim> replied|settled|declined [amount] [outcome]');
    if (status === 'replied') return db.query('update claims set responded_on = coalesce(responded_on, mover_today()) where id = $1 returning id, name, status, responded_on', [c.id]);
    const amount = status === 'settled' ? money(args[2], 'settled amount') : null;
    const outcome = args.slice(status === 'settled' ? 3 : 2).join(' ').trim() || null;
    return db.query('update claims set status = $1, settled_amount = $2, outcome = $3, responded_on = coalesce(responded_on, mover_today()) where id = $4 returning id, name, status, settled_amount, responded_on', [status, amount, outcome, c.id]);
  }
  if (cmd === 'log') {
    const c = await resolve(db, 'customers', args[0]);
    const note = args.slice(1).join(' ').trim();
    if (!note) throw Error('log <customer> <note>');
    await db.query('update customers set last_contact_on = mover_today() where id = $1', [c.id]);
    return db.query('insert into activity (name, customer_id, note) values ($1, $2, $3) returning *', ['Contact with ' + c.name, c.id, note]);
  }
  if (cmd === 'add' || cmd === 'set') return write(db, cmd, args);
  throw Error(`Unknown command "${cmd}". Run help.`);
}

// ------------------------------------------------------------------ crew and trucks

async function allocate(db, p, args, opts) {
  const [jq, cq, on, hours] = args;
  if (!jq || !cq || !on || !hours) throw Error('allocate <job> <crew> <YYYY-MM-DD> <hours> [--truck=<truck>] [--driving]');
  const j = await job(db, jq);
  const c = await resolve(db, 'crew', cq);
  date(on);
  number(hours, 'hours');
  if (!['booked', 'quoted'].includes(j.status)) throw Error(`${j.name} is ${j.status}`);
  if (!c.active) throw Error(`${c.name} is not active`);
  const t = opts.truck ? await resolve(db, 'trucks', opts.truck) : null;
  if (opts.driving && !t) throw Error('A driving allocation needs --truck=<truck>');
  if (t && !t.active) throw Error(`${t.name} is off the road`);
  const notes = [];
  if (opts.driving) {
    if (!c.licence_expires_on) throw Error(`${c.name} has no licence on file`);
    if (day(c.licence_expires_on) < on && !opts.override) throw Error(`${c.name}'s licence expires ${day(c.licence_expires_on)}, before ${on}. Renew it first, or pass --override="reason".`);
  }
  const [d] = await db.query('select coalesce(sum(a.hours), 0) as hours, bool_or(a.driving and tr.gvm_t > $3) as heavy from allocations a left join trucks tr on tr.id = a.truck_id where a.crew_id = $1 and a.work_on = $2 and a.job_id <> $4', [c.id, on, p.fatigue_gvm_t, j.id]);
  const total = Number(d.hours) + Number(hours);
  const heavy = d.heavy || (opts.driving && Number(t.gvm_t) > Number(p.fatigue_gvm_t));
  if (heavy && total > Number(p.max_work_hours) && !opts.override) throw Error(`${c.name} would work ${total} hours on ${on} with heavy vehicle driving. Standard hours allow ${Number(p.max_work_hours)} in 24. Split the day, or pass --override="reason".`);
  if (total > Number(p.max_work_hours)) notes.push(`${total} hours that day`);
  if (t) {
    const [clash] = await db.query('select string_agg(distinct j.name, \', \') as jobs from allocations a join jobs j on j.id = a.job_id where a.truck_id = $1 and a.work_on = $2 and a.job_id <> $3', [t.id, on, j.id]);
    if (clash.jobs) notes.push(`${t.name} is also on ${clash.jobs} that day`);
  }
  const rows = await db.query('insert into allocations (name, job_id, crew_id, truck_id, work_on, hours, driving) values ($1, $2, $3, $4, $5, $6, $7) on conflict (job_id, crew_id, work_on) do update set truck_id = excluded.truck_id, hours = excluded.hours, driving = excluded.driving returning id, name, work_on, hours, driving',
    [`${j.name} ${c.name}`, j.id, c.id, t?.id || null, on, hours, Boolean(opts.driving)]);
  if (notes.length) rows[0].note = notes.join('; ');
  return rows;
}

// ------------------------------------------------------------------ storage billing

async function storageRun(db, p) {
  const out = [];
  const due = await db.query("select * from storage_accounts where status = 'active' and billed_to < mover_today() + $1::int order by name", [p.storage_bill_ahead_days]);
  for (const s of due) {
    const [period] = await db.query("select ($1::date + 1)::text as f, (($1::date + 1) + interval '1 month' - interval '1 day')::date::text as t", [s.billed_to]);
    // A rate change takes effect from the first period that starts on or after its date.
    const [change] = await db.query('select * from rate_changes where storage_id = $1 and not applied and effective_on <= $2 order by effective_on desc limit 1', [s.id, period.f]);
    let rate = s.rate;
    if (change) {
      rate = change.new_rate;
      await db.query('update rate_changes set applied = true where id = $1', [change.id]);
      await db.query('update storage_accounts set rate = $1, last_increase_on = case when $1 > rate then $2::date else last_increase_on end where id = $3', [rate, day(change.effective_on), s.id]);
    }
    const [inv] = await db.query("insert into invoices (name, customer_id, storage_id, kind, amount, currency, due_on, period_from, period_to) values ($1, $2, $3, 'storage', $4, $5, $6, $6, $7) returning id, name, amount, period_from, period_to",
      [await nextName(db, 'invoices', 'INV-', 1000), s.customer_id, s.id, rate, p.currency, period.f, period.t]);
    await db.query('update storage_accounts set billed_to = $1 where id = $2', [period.t, s.id]);
    out.push({ ...inv, account: s.name, rate_changed: change ? `${cur(change.old_rate)} to ${cur(change.new_rate)}` : '' });
  }
  return out.length ? out : [{ billed: 0 }];
}

// ------------------------------------------------------------------ add and set

async function write(db, cmd, args) {
  const [type, ...rest] = args;
  if (!fields[type]) throw Error('Writable types: ' + Object.keys(fields).join(', '));
  if (cmd === 'add' && ['jobs', 'storage_accounts'].includes(type)) throw Error(type === 'jobs' ? 'Jobs start with enquiry, not add' : 'Storage accounts start with store, not add');
  const record = cmd === 'set' ? (type === 'jobs' ? await job(db, rest.shift()) : type === 'company_profile' ? await profile(db) : await resolve(db, type, rest.shift())) : null;
  let value;
  try { value = JSON.parse(rest.join(' ')); } catch { throw Error('Supply one JSON object of field values'); }
  if (!value || Array.isArray(value) || typeof value !== 'object' || !Object.keys(value).length) throw Error('Supply a non-empty JSON object');
  for (const k of Object.keys(value)) {
    if (!fields[type].includes(k)) throw Error(`Field ${k} is not writable on ${type}. Writable: ${fields[type].join(', ')}`);
    if (k.endsWith('_on') && value[k] !== null) date(value[k]);
  }
  const keys = Object.keys(value), vals = Object.values(value);
  if (record) return db.query(`update ${type} set ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} where id = $${vals.length + 1} returning *`, [...vals, record.id]);
  return db.query(`insert into ${type} (${keys.join(', ')}) values (${vals.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, vals);
}

// ------------------------------------------------------------------ drafts

async function draft(db, cmd, args) {
  const p = await profile(db);
  const sign = `\n\nRegards,\n${p.name}\n\nDraft. A person reviews and sends it. No payment link added.`;
  if (cmd === 'draft-quote') {
    const j = await job(db, args[0]);
    if (!j.quote_amount) throw Error(`${j.name} has no quote yet. Run quote first.`);
    const items = await db.query('select room, name, qty, qty * m3_each as m3, value, declared_on from inventory where job_id = $1 order by room, name', [j.id]);
    const high = items.filter((i) => Number(i.value) >= Number(p.high_value_limit));
    return draftFile('quote', j.id, `Subject: Your moving quote ${j.name} from ${p.name}\n\nHi ${first(j.customer)},\n\nThank you for asking us to quote your move. This is our written quote.\n\nFrom: ${j.from_address || 'to confirm'}\nTo: ${j.to_address || 'to confirm'}\nMove date: ${day(j.move_on) || 'to confirm'}\nPick-up and delivery: on the move date unless agreed otherwise in writing\n\nWhat we are moving (${Number(j.volume_m3).toFixed(1)} m3):\n${items.length ? items.map((i) => `- ${i.room ? i.room + ': ' : ''}${i.name} x${i.qty} (${Number(i.m3).toFixed(1)} m3)`).join('\n') : '- Based on the details you gave us. Send us a list or book a video survey and we will confirm it.'}\n\nPrice: ${cur(j.quote_amount)}${j.est_hours ? ` (about ${j.est_hours} hours at ${cur(p.hourly_rate)} an hour for the crew and truck)` : ''}.\n${j.to_storage ? `Storage: ${j.storage_rate ? cur(j.storage_rate) + ' a month, billed monthly in advance' : 'the monthly storage rate will be confirmed in writing before you accept'}.\n` : ''}Deposit to book: ${p.deposit_pct}% of the price.\nThis quote is valid until ${day(j.quote_valid_to)}.\n\nIf there are more goods on the day than listed here, we will agree the change with you in writing before we move them.${high.length ? `\n\nItems worth ${cur(p.high_value_limit)} or more: ${high.map((i) => i.name).join(', ')}. Please confirm their value in writing so they are covered and handled correctly.` : ''}\n\nTransit insurance is available and covers your goods while they are packed, moved and stored. Tell us if you would like it.${sign}`);
  }
  if (cmd === 'draft-follow-up') {
    const j = await job(db, args[0]);
    if (j.status !== 'quoted') throw Error(`${j.name} is ${j.status}, not quoted`);
    return draftFile('follow-up', j.id, `Subject: Your move on ${day(j.move_on)}\n\nHi ${first(j.customer)},\n\nI wanted to check you received our quote ${j.name} for ${cur(j.quote_amount)}. It is valid until ${day(j.quote_valid_to)}, and we are holding a crew and truck for ${day(j.move_on)} for now.\n\nIf anything on the inventory has changed, reply with the changes and we will update the quote the same day.${sign}\n\nRecord it once sent: follow-up "${j.name}" "Sent follow-up email"`);
  }
  if (cmd === 'draft-reminder') {
    const c = await resolve(db, 'customers', args[0]);
    const owing = await db.query('select name, job, kind, balance, due_on from invoice_balances where customer_id = $1 and not void and balance > 0 and due_on < mover_today() order by due_on', [c.id]);
    if (!owing.length) throw Error(`${c.name} has nothing overdue`);
    const total = owing.reduce((n, o) => n + Number(o.balance), 0);
    return draftFile('reminder', c.id, `Subject: Your account with ${p.name}\n\nHi ${first(c.name)},\n\nOur records show the following is overdue:\n\n${owing.map((o) => `- ${o.name} (${o.job || 'storage'}, ${o.kind}): ${cur(o.balance)}, due ${day(o.due_on)}`).join('\n')}\n\nTotal: ${cur(total)}.\n\nIf you have already paid, reply with the date and reference and we will match it up.${sign}`);
  }
  if (cmd === 'draft-storage-notice') {
    const s = await account(db, args[0]);
    if (!(s.days_overdue > 0)) throw Error(`${s.name} has nothing overdue`);
    const owing = await db.query('select name, balance, due_on, period_from, period_to from invoice_balances where storage_id = $1 and not void and balance > 0 order by due_on', [s.id]);
    const final = s.overdue_notice_on && s.days_overdue >= p.storage_final_days;
    const [d] = await db.query('select (mover_today() + $1::int)::text as d', [p.storage_sale_notice_days]);
    const lines = owing.map((o) => `- ${o.name}, storage ${day(o.period_from)} to ${day(o.period_to)}: ${cur(o.balance)}, due ${day(o.due_on)}`).join('\n');
    if (!final) return draftFile('storage-overdue', s.id, `Subject: Storage account ${s.name} is overdue\n\nHi ${first(s.customer)},\n\nStorage fees for your goods (${s.containers} container${s.containers === 1 ? '' : 's'}) are overdue:\n\n${lines}\n\nTotal: ${cur(s.owing)}.\n\nPlease pay or contact us to arrange a plan. Goods are released only once the account is up to date.${sign}\n\nRecord it once sent: storage-notice "${s.name}" overdue email`);
    return draftFile('storage-final', s.id, `Subject: Final notice: goods in storage, account ${s.name}\n\nTo ${s.customer},\n\nYour storage account ${s.name} has been unpaid since ${day(s.oldest_due)}. We wrote to you on ${day(s.overdue_notice_on)}.\n\n${lines}\n\nTotal owing: ${cur(s.owing)}.\n\nThis is a final notice. If the account is not paid, or you do not contact us to collect your goods, we may sell or dispose of them from ${d.d}, as our storage terms and the uncollected goods law that applies allow. Any money from a sale above what is owed and the costs of the sale is yours, and we will hold it for you.${sign}\n\nRecord it once sent: storage-notice "${s.name}" final post`);
  }
  throw Error(`Unknown command "${cmd}". Run help.`);
}

// ------------------------------------------------------------------ attention and compliance

export async function attention(db) {
  const out = [];
  const add = (who, issue, detail) => out.push({ who, issue, detail });
  for (const r of (await run(db, 'enquiries')).filter((x) => x.stage === 'reply overdue')) add(r.customer, 'enquiry not answered', `${r.job}, ${r.days_waiting} days, moving ${day(r.move_on)}`);
  for (const r of (await run(db, 'pipeline')).filter((x) => x.stage !== 'waiting')) add(r.customer, r.stage, `${r.job}, ${cur(r.quote_amount)}, moving ${day(r.move_on)}`);
  for (const r of await run(db, 'schedule')) {
    if (!Number(r.crew_booked)) add(r.customer, 'no crew booked', `${r.job} moves ${day(r.move_on)}`);
    if (r.deposit === 'not paid') add(r.customer, 'deposit not paid', `${r.job} moves ${day(r.move_on)}`);
    if (r.insurance === 'not asked') add(r.customer, 'transit insurance not offered', r.job);
  }
  for (const r of (await run(db, 'cube')).filter((x) => x.verdict === 'will not fit in one load')) add(r.customer, 'will not fit', `${r.job}: ${r.volume_m3} m3 into ${r.truck_m3} m3 of truck`);
  for (const r of (await run(db, 'diary')).filter((x) => x.flag)) add(r.crew, 'over the fatigue limit', `${r.hours} hours on ${day(r.work_on)} (${r.jobs})`);
  for (const r of (await run(db, 'licences')).filter((x) => x.next_drive)) add(r.name, 'licence lapses', `expires ${day(r.licence_expires_on)}, next drives ${day(r.next_drive)}`);
  for (const r of await run(db, 'high-value')) add(r.customer, 'high-value item not declared', `${r.job}: ${r.item}, ${cur(r.value)}`);
  for (const r of await run(db, 'unbilled')) add(r.customer, 'not invoiced', `${r.job}, ${cur(r.to_invoice)}`);
  for (const r of await run(db, 'debtors')) add(r.customer, 'overdue invoice', `${r.invoice} (${r.kind}), ${cur(r.balance)}, ${r.days_overdue} days`);
  for (const r of await run(db, 'storage-arrears')) if (['send overdue notice', 'send final notice', 'disposal allowed'].includes(r.stage)) add(r.customer, r.stage, `${r.account}, ${cur(r.owing)}, ${r.days_overdue} days overdue`);
  const [bill] = await db.query("select count(*)::int as n from storage_accounts s cross join company_profile p where s.status = 'active' and s.billed_to < mover_today() + p.storage_bill_ahead_days");
  if (bill.n) add('Office', 'storage run due', `${bill.n} account${bill.n === 1 ? '' : 's'} to bill`);
  const review = await run(db, 'rate-review');
  if (review.length) add('Office', 'storage rate review', `${review.length} account${review.length === 1 ? '' : 's'} under the standard rate, ${cur(review.reduce((n, r) => n + Number(r.gap), 0))} a month`);
  for (const r of (await run(db, 'claims')).filter((x) => x.flag)) add(r.name.split(':')[0], 'claim not answered', `${r.job}, ${cur(r.amount_claimed)}, ${r.days_open} days`);
  return out;
}

const NT = 'https://consumeraffairs.nt.gov.au/_resources/documents/for-consumers/shopping-for-goods-and-services/removalists.pdf';
const NSW = 'https://www.nsw.gov.au/legal-and-justice/consumer-rights-and-protection/be-a-smart-consumer/choosing-a-removalist';
const NHVR = 'https://www.nhvr.gov.au/work-and-rest';
const UGA = 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1995-068';
const CCLA = 'https://www.legislation.govt.nz/act/public/2017/0005/latest/whole.html';
const TERMS = 'docs/compliance.md';

export async function compliance(db) {
  const p = await profile(db);
  const rules = [
    ['WRITTEN-QUOTE', 'Every booked move has a written quote with the full cost, sent before the customer accepts (consumer guidance: get the quote in writing)', NT,
      "select name, 'booked ' || accepted_on || ' with no written quote sent' as detail from jobs where status in ('booked', 'completed') and (quote_sent_on is null or quote_sent_on > accepted_on)"],
    ['STORAGE-COSTS', 'A quote that includes storage states the storage cost', NT,
      "select name, 'goes into storage, no storage rate quoted' as detail from jobs where to_storage and storage_rate is null and status in ('quoted', 'booked')"],
    ['VARIATION-IN-WRITING', 'More goods or work than quoted: the adjusted price is agreed in writing', NT,
      "select j.name, v.name || ' (' || v.amount || ') agreed ' || coalesce(v.agreed_how, 'not at all') as detail from variations v join jobs j on j.id = v.job_id where v.agreed_how is null or v.agreed_how = 'verbal'"],
    ['INVENTORY-QUOTE', `A detailed written quote is based on an inventory of the goods; moves over ${Number(p.survey_over_m3)} m3 are surveyed (your rule)`, NSW,
      `select j.name, case when j.items = 0 then 'quoted with no inventory' else j.volume_m3 || ' m3 quoted with no survey' end as detail
       from job_detail j where j.status in ('quoted', 'booked') and (j.items = 0 or (j.volume_m3 > ${Number(p.survey_over_m3)} and j.survey = 'none'))`],
    ['TRANSIT-INSURANCE', 'Transit insurance offered and the answer recorded before the move', NSW,
      "select name, 'moves ' || move_on || ', insurance not asked' as detail from jobs where status = 'booked' and insurance is null"],
    ['SUBCONTRACT-CONSENT', 'Goods handed to another carrier only with the customer\'s written approval', NT,
      "select name, 'subcontracted to ' || subcontractor || ', no consent recorded' as detail from jobs where subcontractor is not null and sub_consent_on is null and status in ('booked', 'completed')"],
    ['HIGH-VALUE-DECLARED', `Items worth ${Number(p.high_value_limit)} or more are declared in writing before the move (your terms)`, TERMS,
      `select j.name, i.name || ' worth ' || i.value || ' not declared' as detail from inventory i join jobs j on j.id = i.job_id
       where i.value >= ${Number(p.high_value_limit)} and i.declared_on is null and j.status in ('quoted', 'booked')`],
    ['FATIGUE-STANDARD-HOURS', `A solo driver of a heavy vehicle over ${Number(p.fatigue_gvm_t)} t GVM works at most ${Number(p.max_work_hours)} hours in 24 (NHVR standard hours)`, NHVR,
      `select crew || ' ' || work_on as name, hours || ' hours rostered (' || jobs || ')' as detail from crew_days where drove_heavy and hours > ${Number(p.max_work_hours)}`],
    ['LICENCE-CURRENT', 'A driver holds a current licence on every day they drive', TERMS,
      "select c.name, 'drives ' || a.work_on || ', licence expires ' || coalesce(c.licence_expires_on::text, 'not recorded') as detail from allocations a join crew c on c.id = a.crew_id where a.driving and a.work_on >= mover_today() and (c.licence_expires_on is null or c.licence_expires_on < a.work_on)"],
    ['STORAGE-RATE-NOTICE', `At least ${p.storage_rate_notice_days} days' written notice of a storage rate rise (your storage terms)`, TERMS,
      `select r.name, 'notice ' || r.notice_on || ', effective ' || r.effective_on || ' (' || (r.effective_on - r.notice_on) || ' days)' as detail from rate_changes r where r.new_rate > r.old_rate and r.effective_on - r.notice_on < ${p.storage_rate_notice_days}`],
    [p.jurisdiction === 'NZ' ? 'UNCOLLECTED-GOODS-NZ' : 'UNCOLLECTED-GOODS', `Goods in storage are sold or disposed of only after written notice, at least ${p.storage_sale_notice_days} days before (your terms and the uncollected goods law that applies)`, p.jurisdiction === 'NZ' ? CCLA : UGA,
      `select s.name, case when n.given_on is null then 'disposed ' || s.disposed_on || ' with no final notice' else 'disposed ' || s.disposed_on || ', final notice ' || n.given_on end as detail
       from storage_accounts s left join lateral (select max(given_on) as given_on from notices where storage_id = s.id and kind = 'final' and given_on <= s.disposed_on) n on true
       where s.disposed_on is not null and (n.given_on is null or s.disposed_on - n.given_on < ${p.storage_sale_notice_days})`],
    ...(p.jurisdiction === 'NZ' ? [['CARRIAGE-TERMS', 'NZ: the contract of carriage records the terms agreed (limited carriage, declared value, owner\'s risk or agreed terms) under the Contract and Commercial Law Act 2017, Part 5', CCLA,
      "select name, 'booked with no carriage terms recorded' as detail from jobs where status in ('booked', 'completed') and carriage_terms is null"]] : []),
    ['CLAIM-RESPONSE', `A damage claim is answered within ${p.claim_response_days} days (your rule)`, TERMS,
      `select name, 'lodged ' || lodged_on || ', no reply' as detail from claims where status = 'open' and responded_on is null and lodged_on <= mover_today() - ${p.claim_response_days}`],
  ];
  const out = [];
  for (const [rule, requirement, source, sql] of rules) for (const r of await db.query(sql)) out.push({ rule, record: r.name, detail: r.detail, requirement, source });
  return out;
}
