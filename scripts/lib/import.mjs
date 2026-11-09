// Moveware import: a job list report exported from Moveware's reports to Excel and saved as CSV.
// One row per job (removal, storage or office move). Report layouts are set up per business, so
// every field accepts the usual names; columns this does not use are ignored. One transaction per
// file: a bad row rolls the whole file back. Re-running the same file updates jobs, never duplicates.
import { readFileSync } from 'node:fs';
import { parseCsv, pick, yesNo } from './csv.mjs';

function isoDate(s, order, where) {
  if (!s) return null;
  const v = s.trim().split(/[ T]/)[0];
  let iso = v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (!m || !['DMY', 'MDY'].includes(order)) throw Error(`${where}: date "${s}" needs --date-order=DMY or MDY (or ISO dates)`);
    const [d, mo] = order === 'DMY' ? [m[1], m[2]] : [m[2], m[1]];
    iso = `${m[3]}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const t = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== iso) throw Error(`${where}: invalid date "${s}"`);
  return iso;
}
function amount(s, what, where) {
  const v = String(s || '').replace(/[$,\s]/g, '');
  if (!v) return null;
  if (!/^\d+(\.\d+)?$/.test(v)) throw Error(`${where}: ${what} "${s}" is not a number`);
  return v;
}
const STATUS = [
  [/^(enquiry|enquiries|lead|new|inquiry)$/i, 'enquiry'],
  [/^(quote|quoted|estimate|estimated|quote sent|pending)$/i, 'quoted'],
  [/^(booked|confirmed|accepted|scheduled|in progress)$/i, 'booked'],
  [/^(completed|complete|delivered|invoiced|closed|finished)$/i, 'completed'],
  [/^(lost|declined|not proceeding|rejected)$/i, 'lost'],
  [/^(cancelled|canceled)$/i, 'cancelled'],
];
const KIND = [
  [/international|overseas|export|import/i, 'international'],
  [/interstate|linehaul|inter-island/i, 'interstate'],
  [/country|regional/i, 'country'],
  [/office|commercial|business/i, 'office'],
  [/storage/i, 'storage'],
];

export async function importMoveware(db, file, opts = {}) {
  const raw = parseCsv(readFileSync(file, 'utf8'));
  if (!raw.length) throw Error('No rows found in ' + file);
  const [{ d: today }] = await db.query('select mover_today()::text as d');
  const [profile] = await db.query('select currency from company_profile');
  if (!profile) throw Error('Add the company profile before importing: add company_profile {"name":"Your Removals"}');
  const seen = new Set();
  const rows = raw.map((r, i) => {
    const where = `Row ${i + 2}`;
    const get = (...k) => pick(r, ...k).trim();
    const jobNo = get('Job No', 'Job Number', 'Job', 'Job ID', 'Removal No', 'File No', 'Reference');
    if (!jobNo) throw Error(`${where}: every row needs a Job No column. See docs/replace-moveware.md`);
    if (seen.has(jobNo.toLowerCase())) throw Error(`${where}: duplicate job ${jobNo}`);
    seen.add(jobNo.toLowerCase());
    const customer = get('Customer', 'Customer Name', 'Client', 'Client Name', 'Shipper', 'Name') || [get('First Name', 'Firstname'), get('Last Name', 'Surname')].filter(Boolean).join(' ') || get('Company', 'Account');
    if (!customer) throw Error(`${where}: job ${jobNo} has no customer`);
    const statusText = get('Status', 'Job Status', 'Stage');
    const status = (STATUS.find(([re]) => re.test(statusText)) || [])[1];
    if (!status) throw Error(`${where}: status "${statusText}" is not one this import knows. Map it in scripts/lib/import.mjs or fix the export.`);
    const typeText = get('Job Type', 'Type', 'Move Type', 'Service');
    const m3 = amount(get('Volume', 'Volume (m3)', 'Cubic Metres', 'Cubic Meters', 'm3', 'Cube', 'CBM'), 'volume', where);
    const cuft = amount(get('Cubic Feet', 'Volume (cu ft)', 'cu ft'), 'cubic feet', where);
    const row = {
      jobNo, customer, status,
      kind: (KIND.find(([re]) => re.test(typeText)) || [])[1] || 'local',
      email: get('Email', 'Email Address', 'Customer Email') || null,
      phone: get('Mobile', 'Phone', 'Mobile Phone', 'Phone Number') || null,
      from: get('Origin', 'From', 'From Address', 'Origin Address', 'Pickup Address', 'Uplift Address') || null,
      to: get('Destination', 'To', 'To Address', 'Destination Address', 'Delivery Address') || null,
      enquiryOn: isoDate(get('Enquiry Date', 'Date Entered', 'Created', 'Created Date', 'Lead Date'), opts.dateOrder, where),
      moveOn: isoDate(get('Move Date', 'Removal Date', 'Uplift Date', 'Pack Date', 'Load Date', 'Job Date'), opts.dateOrder, where),
      quoteOn: isoDate(get('Quote Date', 'Estimate Date', 'Quoted Date'), opts.dateOrder, where),
      quote: amount(get('Quote', 'Quote Amount', 'Quoted Price', 'Estimate', 'Estimate Amount', 'Total', 'Job Total', 'Price'), 'quote amount', where),
      hours: amount(get('Estimated Hours', 'Est Hours', 'Hours'), 'hours', where),
      m3: m3 || (cuft ? (Number(cuft) * 0.0283168).toFixed(3) : null),
      storage: yesNo(get('Storage', 'Into Storage', 'Storage Required')) || /storage/i.test(typeText),
      storageRate: amount(get('Storage Rate', 'Monthly Storage', 'Storage Charge'), 'storage rate', where),
      source: get('Source', 'Lead Source', 'Referral Source') || null,
      lostReason: get('Lost Reason', 'Reason Lost', 'Reason') || null,
    };
    if (['quoted', 'booked', 'completed'].includes(status) && !row.quote) throw Error(`${where}: job ${jobNo} is ${status} but has no quote amount`);
    if (['booked', 'completed'].includes(status) && !row.moveOn) throw Error(`${where}: job ${jobNo} is ${status} but has no move date`);
    return row;
  });

  const counts = { customers_created: 0, jobs_created: 0, jobs_updated: 0, volumes_loaded: 0, quoted_without_quote_date: 0 };
  await db.exec('BEGIN');
  try {
    for (const [i, r] of rows.entries()) {
      try {
        let [c] = r.email ? await db.query('select * from customers where lower(email) = lower($1)', [r.email]) : [];
        if (!c) [c] = await db.query('select * from customers where lower(name) = lower($1)', [r.customer]);
        if (c) [c] = await db.query('update customers set email = coalesce(email, $1), phone = coalesce(phone, $2) where id = $3 returning *', [r.email, r.phone, c.id]);
        else {
          [c] = await db.query('insert into customers (name, email, phone, source, business) values ($1, $2, $3, $4, $5) returning *', [r.customer, r.email, r.phone, r.source, /\b(pty|ltd|limited|trust)\b/i.test(r.customer)]);
          counts.customers_created++;
        }
        const enquiryOn = r.enquiryOn || r.quoteOn || today;
        const accepted = ['booked', 'completed'].includes(r.status) ? (r.quoteOn || enquiryOn) : null;
        if (r.quote && !r.quoteOn) counts.quoted_without_quote_date++;
        const vals = [c.id, r.kind, r.from, r.to, r.status, enquiryOn, r.source, r.moveOn, r.hours, r.storage, r.storageRate, r.quote, r.quoteOn, accepted, r.status === 'completed' ? r.moveOn : null, r.status === 'lost' ? r.lostReason : null];
        const [existing] = await db.query('select id from jobs where lower(name) = lower($1)', [r.jobNo]);
        let jobId;
        if (existing) {
          await db.query(`update jobs set customer_id = $1, kind = $2, from_address = coalesce($3, from_address), to_address = coalesce($4, to_address), status = $5, enquiry_on = $6, source = coalesce($7, source), move_on = coalesce($8, move_on), est_hours = coalesce($9, est_hours), to_storage = $10, storage_rate = coalesce($11, storage_rate), quote_amount = coalesce($12, quote_amount), quote_sent_on = coalesce($13, quote_sent_on), accepted_on = coalesce(accepted_on, $14), completed_on = coalesce(completed_on, $15), lost_reason = coalesce($16, lost_reason) where id = $17`, [...vals, existing.id]);
          jobId = existing.id;
          counts.jobs_updated++;
        } else {
          const [j] = await db.query(`insert into jobs (customer_id, kind, from_address, to_address, status, enquiry_on, source, move_on, est_hours, to_storage, storage_rate, quote_amount, quote_sent_on, accepted_on, completed_on, lost_reason, name) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) returning id`, [...vals, r.jobNo]);
          jobId = j.id;
          counts.jobs_created++;
        }
        if (r.m3) {
          await db.query("delete from inventory where job_id = $1 and name = 'Imported volume'", [jobId]);
          await db.query("insert into inventory (name, job_id, room, qty, m3_each) values ('Imported volume', $1, 'From Moveware', 1, $2)", [jobId, r.m3]);
          counts.volumes_loaded++;
        }
      } catch (e) {
        throw Error(`Row ${i + 2}: ${e.message}`);
      }
    }
    if (opts.dryRun) { await db.exec('ROLLBACK'); return [{ dry_run: true, rows: rows.length, ...counts }]; }
    await db.query('insert into audit (name, detail) values ($1, $2)', ['import moveware', JSON.stringify({ file, ...counts })]);
    await db.exec('COMMIT');
    return [{ rows: rows.length, ...counts }];
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}
