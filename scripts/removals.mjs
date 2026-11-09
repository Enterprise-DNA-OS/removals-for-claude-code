#!/usr/bin/env node
// The one CLI. Human tables by default, --json for machines.
//   node scripts/removals.mjs help
//   node scripts/removals.mjs pipeline
//   node scripts/removals.mjs allocate MOV-1008 "Sean Murphy" 2026-11-10 6 --truck="Truck 2" --driving
import { getDb } from './lib/db.mjs';
import { run } from './lib/domain.mjs';
import { table } from './lib/format.mjs';

const opts = {}, args = [];
const value = (a) => a.slice(a.indexOf('=') + 1).replace(/^"(.*)"$/, '$1');
for (const a of process.argv.slice(2)) {
  if (a === '--json') opts.json = true;
  else if (a === '--dry-run') opts.dryRun = true;
  else if (a === '--driving') opts.driving = true;
  else if (a.startsWith('--date-order=')) opts.dateOrder = value(a).toUpperCase();
  else if (/^--(override|from|to|email|phone|source|qty|room|value|hours|storage-rate|how|truck|location|standard)=/.test(a)) opts[a.slice(2, a.indexOf('='))] = value(a);
  else if (a.startsWith('--')) { console.error('Unknown option ' + a); process.exit(1); }
  else args.push(a);
}

const cell = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v !== null && typeof v === 'object' ? JSON.stringify(v) : v);
function show(value) {
  if (Array.isArray(value)) {
    if (!value.length) return console.log('  (nothing)');
    const rows = value.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cell(v)])));
    console.log(table(rows, Object.keys(rows[0]).map((key) => ({ key, label: key, width: 50 }))));
  } else for (const [k, v] of Object.entries(value)) { console.log('\n' + k); show(Array.isArray(v) ? v : v ? [v] : []); }
}

let db;
try {
  db = await getDb();
  const result = await run(db, args.shift() || 'help', args, opts);
  opts.json ? console.log(JSON.stringify(result, null, 2)) : show(result);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db?.close();
}
