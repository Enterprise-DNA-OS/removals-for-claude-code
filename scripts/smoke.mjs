#!/usr/bin/env node
// npm test: a throwaway database, the schema, the demo mover, every command, then the real
// executables. Embedded PGlite by default; TEST_DATABASE_URL runs the same test on Postgres.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, commands, reads } from './lib/domain.mjs';

const tmp = mkdtempSync(path.join(tmpdir(), 'removals-test-'));
process.env.DATA_DIR = path.join(tmp, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = tmp;

let db, assertions = 0;
const exercised = new Set();
const call = (c, a = [], o = {}) => { exercised.add(c); return run(db, c, a, o); };
const ok = (x, msg) => { assert.ok(x, msg); assertions++; };
const fails = async (c, a, pattern, o = {}) => { await assert.rejects(() => call(c, a, o), pattern); assertions++; };
const one = async (sql) => (await db.query(sql))[0];
const d = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
const inDays = async (n) => (await one(`select (mover_today() + ${n})::text as d`)).d;
const rules = async () => (await call('compliance')).map((r) => `${r.rule}:${r.record}`);

try {
  db = await getDb();
  if (process.env.TEST_DATABASE_URL) await db.exec('drop schema public cascade; create schema public;');
  ok((await migrate(db)).ran.length === 1, 'schema applies');
  await seed(db);
  await seed(db);
  ok((await migrate(db)).ran.length === 0, 'migrate is idempotent');
  ok((await call('customers')).length === 22, 'seed is idempotent');

  // Every read runs, and the demo says what it should.
  for (const c of Object.keys(reads)) ok(Array.isArray(await call(c)), c);
  ok((await call('enquiries')).map((r) => `${r.job}:${r.stage}`).join() === 'MOV-1001:reply overdue,MOV-1002:new', 'enquiries');
  const pipe = Object.fromEntries((await call('pipeline')).map((r) => [r.job, r.stage]));
  ok(pipe['MOV-1003'] === 'follow up today' && pipe['MOV-1004'] === 'expired, still open' && pipe['MOV-1005'] === 'waiting', 'quote pipeline');
  const sched = await call('schedule');
  ok(sched.length === 5 && sched[0].job === 'MOV-1008' && Number(sched[0].crew_booked) === 0, 'schedule, tomorrow has no crew');
  ok(sched.find((r) => r.job === 'MOV-1006').deposit === 'not paid', 'deposit not paid');
  ok((await call('diary')).filter((r) => r.flag).map((r) => r.crew).join() === 'Ben Carter', 'fatigue flag');
  ok((await call('cube')).find((r) => r.job === 'MOV-1007').verdict === 'will not fit in one load', 'cube check');
  ok((await call('licences')).map((r) => r.name).join() === 'Tama Ngata', 'licence lapsing');
  ok((await call('high-value')).map((r) => r.item).join() === 'Upright piano', 'undeclared piano');
  ok(Number((await call('unbilled'))[0].to_invoice) === 1368, 'unbilled job with its variation');
  ok((await call('debtors')).map((r) => r.invoice).join() === 'INV-1008,INV-1001', 'debtors, oldest first');
  ok((await call('storage-arrears')).map((r) => `${r.account}:${r.stage}`).join() === 'ST-205:disposal allowed,ST-204:send final notice,ST-203:send overdue notice', 'storage ladder');
  ok((await call('rate-review')).map((r) => r.account).join() === 'ST-202', 'storage rate review');
  ok((await call('claims')).find((r) => r.flag === 'reply overdue').job === 'MOV-1010', 'claim not answered');
  ok((await call('conversion')).find((r) => r.source === 'Google').win_pct == 67, 'win rate by source');
  ok(Number((await call('estimates')).find((r) => r.job === 'MOV-1009').over_hours) === 2, 'estimate accuracy');
  ok((await call('attention')).length >= 18, 'attention list');
  const found = await rules();
  for (const r of ['WRITTEN-QUOTE:MOV-1015', 'STORAGE-COSTS:MOV-1016', 'VARIATION-IN-WRITING:MOV-1009', 'INVENTORY-QUOTE:MOV-1003', 'TRANSIT-INSURANCE:MOV-1006', 'SUBCONTRACT-CONSENT:MOV-1007', 'HIGH-VALUE-DECLARED:MOV-1007', 'LICENCE-CURRENT:Tama Ngata', 'STORAGE-RATE-NOTICE:ST-206 rise', 'UNCOLLECTED-GOODS:ST-198', 'CLAIM-RESPONSE:Grace Kim: scratched dining table']) ok(found.includes(r), r);
  ok(found.some((r) => r.startsWith('FATIGUE-STANDARD-HOURS:Ben Carter')), 'fatigue rule');
  const review = await call('weekly-review');
  ok(review['moves this fortnight'].length === 5 && review['quotes to chase'].length === 2 && review['storage arrears'].length === 3, 'weekly review');

  // Lookups: partial, case-insensitive, ambiguous; jobs by number or customer.
  await fails('customer', ['Har'], /Ambiguous customers/);
  ok((await call('customer', ['emma'])).jobs[0].name === 'MOV-1001');
  ok((await call('job', ['1007'])).inventory.length === 4, 'job by partial number');
  ok((await call('job', ['james patel'])).job.name === 'MOV-1007', 'job by customer');
  await fails('job', ['MOV-10'], /Ambiguous job/);

  // Enquiry to booking.
  const move = await inDays(20);
  const [e] = await call('enquiry', ['Ivy Turner', 'local', move], { from: '1 Rose St, Leichhardt', to: '2 Lily St, Annandale', email: 'ivy@example.org', source: 'Google' });
  ok(e.name === 'MOV-1017' && e.status === 'enquiry', 'enquiry numbered');
  await fails('enquiry', ['Ivy Turner', 'teleport', move], /enquiry/);
  await fails('accept', ['MOV-1017'], /Only a quoted job/);
  await fails('quote', ['MOV-1017'], /no estimated hours/);
  await call('survey', ['MOV-1017', 'video']);
  await fails('survey', ['MOV-1017', 'drone'], /survey/);
  const [it] = await call('item', ['MOV-1017', 'Furniture, two bedroom unit', '18']);
  ok(Number(it.job_volume_m3) === 18, 'volume adds up');
  const [art] = await call('item', ['MOV-1017', 'Painting', '0.1'], { value: '4000', room: 'Lounge' });
  ok(/declared in writing/.test(art.note), 'high value flagged on entry');
  await fails('item', ['MOV-1017', 'Box', 'big'], /positive number/);
  const [q] = await call('quote', ['MOV-1017'], { hours: '7' });
  ok(Number(q.quote_amount) === 1260 && d(q.quote_valid_to) === await inDays(30), 'quote from hours at the hourly rate');
  await call('follow-up', ['MOV-1017', 'Called, comparing with one other quote.']);
  await fails('follow-up', ['MOV-1017'], /follow-up/);
  await call('declare', ['MOV-1017', 'Painting']);
  await fails('declare', ['MOV-1017', 'zzz'], /declare/);
  ok(!(await call('high-value')).some((r) => r.job === 'MOV-1017'), 'declared');
  const [acc] = await call('accept', ['MOV-1017']);
  ok(acc.status === 'booked' && Number(acc.deposit) === 252 && acc.deposit_invoice, 'booked with a deposit invoice');
  ok(/transit insurance/.test(acc.note), 'reminded to ask about insurance');
  await fails('insurance', ['MOV-1017', 'taken'], /insured value/);
  await call('insurance', ['MOV-1017', 'taken'], { value: '30000' });
  await fails('accept', ['MOV-1004'], /expired/);
  ok((await call('accept', ['MOV-1004'], { override: 'Customer confirmed old price by phone' }))[0].status === 'booked', 'override recorded');

  // Quote rules.
  const [q16] = await call('quote', ['MOV-1016', '1100']);
  ok(/storage rate/.test(q16.note), 'storage rate missing from a storage quote');
  await call('quote', ['MOV-1016', '1100'], { 'storage-rate': '165' });
  ok(!(await rules()).includes('STORAGE-COSTS:MOV-1016'), 'storage rate quoted');
  ok(/no survey/.test((await call('quote', ['MOV-1003', '1500']))[0].note), 'large move with no survey');

  // Crew and trucks: fatigue, licences, clashes.
  const tomorrow = await inDays(1), plus5 = await inDays(5), plus3 = await inDays(3);
  const [al] = await call('allocate', ['MOV-1008', 'Sean Murphy', tomorrow, '6'], { truck: 'Truck 1', driving: true });
  ok(al.driving === true, 'driver allocated');
  await call('allocate', ['MOV-1008', 'Mia Rossi', tomorrow, '6'], { truck: 'Truck 1' });
  ok(!(await call('attention')).some((r) => r.issue === 'no crew booked' && r.who === 'Ruby Taylor'), 'crew booked');
  await fails('allocate', ['MOV-1007', 'Tama Ngata', plus5, '10'], /licence expires/, { truck: 'Truck 3', driving: true });
  await fails('allocate', ['MOV-1006', 'Ben Carter', plus3, '9'], /Standard hours allow 12/, { truck: 'Truck 2', driving: true });
  await call('allocate', ['MOV-1014', 'Ben Carter', plus3, '4'], { truck: 'Truck 1', driving: true });
  ok(!(await rules()).some((r) => r.startsWith('FATIGUE')), 'fatigue fixed by shortening the day');
  await call('allocate', ['MOV-1007', 'Sean Murphy', plus5, '10'], { truck: 'Truck 3', driving: true });
  await call('set', ['crew', 'Tama Ngata', `{"licence_expires_on":"${await inDays(1000)}"}`]);
  ok(!(await rules()).includes('LICENCE-CURRENT:Tama Ngata'), 'licence renewed');
  const [clash] = await call('allocate', ['MOV-1015', 'Josh Evans', await inDays(7), '6'], { truck: 'Truck 2' });
  ok(!clash.note, 'no clash on its own job');
  const [cl2] = await call('allocate', ['MOV-1017', 'Priya Singh', await inDays(7), '4'], { truck: 'Truck 2' });
  ok(/also on MOV-1015/.test(cl2.note), 'truck clash noticed');
  await fails('allocate', ['MOV-1008', 'Mia Rossi', tomorrow, '6'], /needs --truck/, { driving: true });
  await call('consent', ['MOV-1007']);
  ok(!(await rules()).includes('SUBCONTRACT-CONSENT:MOV-1007'), 'consent recorded');

  // Done, variation, invoice, payment.
  await fails('variation', ['MOV-1001', '100', 'extra'], /Change the quote/);
  const [v] = await call('variation', ['MOV-1008', '180', 'Extra hour, fridge to the garage']);
  ok(/in writing/.test(v.note), 'verbal variation flagged');
  await call('variation', ['MOV-1008', '90', 'Mattress bags'], { how: 'email' });
  await fails('complete', ['MOV-1008', 'x'], /positive number/);
  const [done] = await call('complete', ['MOV-1008', '6']);
  ok(Number(done.to_invoice) === 990 && /over the estimate/.test(done.note), 'completed with the balance to invoice');
  await fails('invoice', ['MOV-1008'], /verbally/);
  const [inv] = await call('invoice', ['MOV-1008'], { override: 'Customer confirmed by text, filed' });
  ok(Number(inv.amount) === 990, 'balance invoiced');
  await fails('invoice', ['MOV-1008'], /fully invoiced/);
  await fails('invoice', ['MOV-1002'], /Invoice the balance/);
  await fails('payment', [inv.name, '2000', 'x'], /exceeds/);
  await fails('payment', [inv.name, '-1', 'x'], /positive/);
  await call('payment', [inv.name, '990', 'DD-9001']);
  await call('payment', ['INV-1001', '328', 'DD-9002']);
  ok(!(await call('debtors')).some((r) => r.invoice === 'INV-1001'), 'deposit paid');

  // Lost and cancelled.
  await call('lose', ['MOV-1002', 'Timing: moving before we had a truck free']);
  await fails('lose', ['MOV-1006', 'x'], /cancelled, not lost/);
  await fails('cancel', ['MOV-1005', 'x'], /Only a booked job/);
  const [cx] = await call('cancel', ['MOV-1014', 'Customer sold the house to the tenant']);
  ok(cx.status === 'cancelled' && cx.crew_released === 2 && /deposit/.test(cx.note), 'cancel releases the crew');

  // Storage: open, bill, raise, notices, disposal, out.
  await fails('store', ['MOV-1016', '2', '165'], /is quoted/);
  await fails('store', ['MOV-1012', '1', '120'], /already has storage/);
  const [st3] = await call('store', ['MOV-1017', '2', '220'], { location: 'Bay D, row 1' });
  ok(st3.name === 'ST-207', 'storage account numbered');
  const runs = await call('storage-run');
  ok(runs.length === 2 && runs.some((r) => r.account === 'ST-202') && runs.some((r) => r.account === 'ST-207'), 'storage run bills what is due');
  ok((await call('storage-run'))[0].billed === 0, 'never billed twice');
  await fails('raise-rate', ['ST-202', '220', await inDays(10)], /28 days/);
  const [rc] = await call('raise-rate', ['ST-202', '220']);
  ok(d(rc.effective_on) === await inDays(28), 'rise effective after the notice period');
  await fails('raise-rate', ['ST-202', '230'], /already has a change/);
  await fails('raise-rate', ['ST-198', '120'], /disposed/);
  await fails('storage-notice', ['ST-201', 'overdue'], /nothing overdue/);
  await fails('storage-notice', ['ST-203', 'final'], /no overdue notice/);
  await call('storage-notice', ['ST-203', 'overdue', 'email']);
  ok((await call('storage-arrears')).find((r) => r.account === 'ST-203').stage === 'overdue notice given');
  const [fin] = await call('storage-notice', ['ST-204', 'final', 'post']);
  ok(d(fin.disposal_from) === await inDays(28), 'disposal date from the final notice');
  await fails('dispose', ['ST-203'], /no final notice/);
  await fails('dispose', ['ST-204'], /Disposal is allowed from 28 days/);
  const [disp] = await call('dispose', ['ST-205']);
  ok(disp.status === 'disposed', 'disposal after the notice period');
  await fails('store-out', ['ST-205'], /disposed/);
  const [out] = await call('store-out', ['Ava Robinson']);
  ok(out.status === 'ended' && /billed to/.test(out.note), 'goods out, unused days noted');

  // Claims.
  const [c] = await call('claim', ['MOV-1009', '300', 'Mirror, frame chipped']);
  await fails('claim', ['MOV-1009', '300'], /claim/);
  await call('close-claim', [c.id, 'replied']);
  ok((await call('claims')).find((r) => r.item === 'Mirror, frame chipped').responded_on, 'claim answered');
  await call('close-claim', ['Grace Kim', 'settled', '400', 'Repair quote accepted']);
  ok(!(await rules()).some((r) => r.startsWith('CLAIM-RESPONSE')), 'claims answered');
  await fails('close-claim', ['Grace Kim', 'declined'], /already settled/);
  await fails('close-claim', ['Mirror', 'maybe'], /close-claim/);

  // NZ switch.
  await call('set', ['company_profile', '{"jurisdiction":"NZ","currency":"NZD"}']);
  const nz = await rules();
  ok(nz.some((r) => r.startsWith('CARRIAGE-TERMS')) && nz.some((r) => r.startsWith('UNCOLLECTED-GOODS-NZ')), 'NZ rules switch on');
  await call('set', ['jobs', 'MOV-1007', '{"carriage_terms":"declared value"}']);
  ok(!(await rules()).includes('CARRIAGE-TERMS:MOV-1007'), 'carriage terms recorded');
  await call('set', ['company_profile', '{"jurisdiction":"AU","currency":"AUD"}']);

  // Records and drafts.
  await call('log', ['Marcus', 'Signed the lease, booking confirmed.']);
  ok((await call('activity')).some((r) => r.note.includes('lease')));
  await fails('log', ['Marcus'], /note/);
  await call('add', ['trucks', '{"name":"Truck 4","gvm_t":4.5,"capacity_m3":20}']);
  await call('add', ['crew', '{"name":"Ana Silva","role":"packer"}']);
  await fails('add', ['jobs', '{"kind":"local"}'], /enquiry/);
  await fails('add', ['trucks', '{"name":"Truck 5","wings":2}'], /not writable/);
  await fails('add', ['trucks', '{"name":"Truck 5","gvm_t":-1,"capacity_m3":1}'], /check/);
  await fails('add', ['notices', '{}'], /Writable types/);
  const quote = readFileSync((await call('draft-quote', ['MOV-1017']))[0].file, 'utf8');
  ok(quote.includes('$1260.00') && quote.includes('valid until') && quote.includes('in writing'), 'written quote drafted');
  await fails('draft-quote', ['MOV-1001'], /no quote yet/);
  ok(readFileSync((await call('draft-follow-up', ['MOV-1003']))[0].file, 'utf8').includes('MOV-1003'));
  await fails('draft-follow-up', ['MOV-1009'], /not quoted/);
  ok(readFileSync((await call('draft-reminder', ['Grace Kim']))[0].file, 'utf8').includes('$624.00'));
  await fails('draft-reminder', ['Emma'], /nothing overdue/);
  ok(readFileSync((await call('draft-storage-notice', ['ST-203']))[0].file, 'utf8').includes('is overdue'), 'overdue notice drafted');
  ok(readFileSync((await call('draft-storage-notice', ['ST-204']))[0].file, 'utf8').includes('Final notice'), 'final notice drafted');
  await fails('draft-storage-notice', ['ST-206'], /nothing overdue/);

  // Moveware import.
  const csv = path.join(REPO_ROOT, 'fixtures', 'moveware-job-list.csv');
  await fails('import', ['moveware', csv], /date-order/);
  const before = (await call('jobs')).length;
  const [dry] = await call('import', ['moveware', csv], { dryRun: true, dateOrder: 'DMY' });
  ok(dry.dry_run && (await call('jobs')).length === before, 'dry run writes nothing');
  const [imp] = await call('import', ['moveware', csv], { dateOrder: 'DMY' });
  ok(imp.jobs_created === 5 && imp.customers_created === 4 && imp.volumes_loaded === 3 && imp.quoted_without_quote_date === 0, 'job list imported: ' + JSON.stringify(imp));
  ok((await call('job', ['MW-24102'])).job.status === 'booked' && Number((await call('job', ['MW-24102'])).job.volume_m3) === 48, 'booked job with its volume');
  ok((await call('customer', ['Daniel Lee'])).jobs.length === 2, 'existing customer matched by email');
  ok((await call('job', ['MW-24103'])).job.to_storage === true, 'storage job');
  const [again] = await call('import', ['moveware', csv], { dateOrder: 'DMY' });
  ok(again.jobs_created === 0 && again.jobs_updated === 5 && again.customers_created === 0, 'import is repeatable');
  ok((await call('job', ['MW-24101'])).inventory.length === 1, 'imported volume not doubled');
  const bad = path.join(tmp, 'bad.csv');
  writeFileSync(bad, 'Job No,Customer Name,Status\nX1,A Person,Enquiry\nX1,B Person,Enquiry\n');
  await fails('import', ['moveware', bad], /duplicate job/);
  writeFileSync(bad, 'Job No,Customer Name,Status\nX1,A Person,Teleported\n');
  await fails('import', ['moveware', bad], /status "Teleported"/);
  writeFileSync(bad, 'Job No,Customer Name,Status,Move Date\nX1,A Person,Booked,2026-12-01\n');
  await fails('import', ['moveware', bad], /no quote amount/);
  writeFileSync(bad, 'Job No,Customer Name,Status,Quote Amount\nX1,A Person,Quoted,lots\n');
  await fails('import', ['moveware', bad], /not a number/);
  writeFileSync(bad, 'Job No,Customer Name,Status,Quote Amount,Volume\nX1,A Person,Quoted,100,5\nX2,,Quoted,100,5\n');
  await fails('import', ['moveware', bad], /Row 3:/);
  ok(!(await one("select count(*)::int as n from jobs where name = 'X1'")).n, 'failed file leaves no rows');
  await fails('import', ['supermove', bad], /import moveware/);

  const backup = path.join(tmp, 'backup.json');
  await call('export', [backup]);
  const saved = JSON.parse(readFileSync(backup, 'utf8'));
  ok(saved.jobs.length === 22 && saved.storage_accounts.length === 8 && saved.audit.length > 40, 'export holds everything');
  ok((await call('help')).length === commands.length);
  await fails('nonsense', [], /Unknown command/);
  ok((await call('audit')).length > 40);
  await db.close();
  db = null;

  // The real executables, after releasing the embedded database.
  const child = (file, args = [], status = 0) => {
    const p = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', file), ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    assert.equal(p.status, status, p.stderr || p.stdout);
    assertions++;
    return p;
  };
  ok(JSON.parse(child('removals.mjs', ['jobs', '--json']).stdout).length === 22);
  ok(child('removals.mjs', ['pipeline']).stdout.includes('stage'));
  ok(child('removals.mjs', ['customer', 'Har'], 1).stderr.includes('Ambiguous'));
  ok(child('removals.mjs', ['pipeline', '--bogus'], 1).stderr.includes('Unknown option'));
  child('view.mjs');
  child('docs.mjs');
  ok(readFileSync(path.join(tmp, 'views', 'week.html'), 'utf8').includes('Harbourside Removals and Storage'), 'view rendered in the mover brand');
  ok(existsSync(path.join(tmp, 'views', 'sales.html')) && existsSync(path.join(tmp, 'views', 'storage.html')));
  ok(readdirSync(path.join(tmp, 'docs-out', 'quote')).length >= 5, 'quotes rendered');
  ok(readdirSync(path.join(tmp, 'docs-out', 'run-sheet')).length >= 2, 'run sheets rendered');
  ok(readdirSync(path.join(tmp, 'docs-out', 'storage-statement')).length >= 5, 'storage statements rendered');
  ok(readdirSync(path.join(tmp, 'docs-out', 'final-notice')).length >= 1, 'final notices rendered');

  const missing = commands.filter((c) => !exercised.has(c));
  ok(!missing.length, 'every command exercised: missing ' + missing.join(', '));
  console.log(`PASS: ${commands.length} commands, ${assertions} assertions on ${process.env.TEST_DATABASE_URL ? 'Postgres' : 'embedded PGlite'}. Enquiries, surveys, quotes from hours, follow-ups, bookings with deposits, crew and trucks with the fatigue and licence checks, variations in writing, invoices and payments, storage billing, rate notices, overdue and final notices with the disposal wait, claims, NZ rules, the Moveware import with rollback, drafts, views and documents. Temporary database removed.`);
} finally {
  await db?.close();
  rmSync(tmp, { recursive: true, force: true });
}
