---
description: Make it the mover's own: change a rate or a period, add a field, rename a job type, or add a check, in plain language. The migration is written, tested and applied.
---

# /customise

The operator describes a change, for example "our hourly rate is $195 for two men and a truck", "deposit is 25%", "quotes are valid for 14 days", "add a piano surcharge", "we run two depots", "track container numbers on storage", "storage overdue notice at 21 days".

1. Read `supabase/migrations/`, `scripts/lib/domain.mjs` and the matching command recipe. Say back in one line what changes and where.
2. If it is a setting (rates, deposit, quote validity, any period or limit on the profile), change it with `node scripts/removals.mjs set company_profile '{"hourly_rate":195}'`. No code.
3. Otherwise write the next numbered migration (`supabase/migrations/0002_<what>.sql`). Never edit an applied migration. Update `fields` in `scripts/lib/domain.mjs` if the field should be writable, the queries, the documents in `documents.json`, the import mapping in `scripts/lib/import.mjs` and the recipe in `.claude/commands/`.
4. Back up first: `node scripts/removals.mjs export backup.json`. Test on a temporary database (`DATA_DIR=/tmp/try npm run demo`), then `npm test`, adding an assertion in `scripts/smoke.mjs` for the new rule.
5. Apply with `npm run migrate` on the working database. Show before and after on real records.

A customer booking page, a crew phone app, card payments or a link to your accounting system is a separate build, not a customisation here.
