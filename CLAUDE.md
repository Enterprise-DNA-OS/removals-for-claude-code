# Removals for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| everything that needs a person today | `/attention` |
| open enquiries not yet quoted, oldest first, with how long each has waited for a reply | `/enquiries` |
| take a new enquiry | `/enquiry` |
| record a video or in-home survey for a job, and build its inventory room by room | `/survey` |
| add an item to a job's inventory with its cubic metres, quantity, room and value | `/item` |
| record that the customer has declared a high-value item in writing | `/declare` |
| price a job from its estimated hours at your hourly rate, or at a figure you give, and set the quote's expiry | `/quote` |
| write the customer's written quote | `/draft-quote` |
| every open quote with its stage | `/pipeline` |
| log a follow-up on a quote | `/follow-up` |
| draft a follow-up email for an open quote | `/draft-follow-up` |
| book a quoted job | `/accept` |
| mark an open enquiry or quote lost, with the reason | `/lose` |
| cancel a booked move | `/cancel` |
| record the customer's answer on transit insurance and the insured value | `/insurance` |
| record the customer's written consent to a subcontracted carrier (linehaul, another removalist) | `/consent` |
| the next 14 days of moves | `/schedule` |
| crew hours by day for the next 14 days, with heavy vehicle drivers over the fatigue limit flagged | `/diary` |
| put a crew member (and a truck) on a job for a day | `/allocate` |
| will each booked move fit its trucks? Volume against the capacity of the trucks allocated | `/cube` |
| crew list with roles, licences and days booked in the next fortnight | `/crew` |
| trucks with GVM, cubic capacity and days booked in the next fortnight | `/trucks` |
| drivers whose licence has lapsed or lapses within the warning period, with their next driving day | `/licences` |
| high-value items on open jobs with no written declaration | `/high-value` |
| record a change to a booked or finished move | `/variation` |
| every variation with how it was agreed | `/variations` |
| close a move with the actual hours worked; shows the balance to invoice | `/complete` |
| finished moves not fully invoiced | `/unbilled` |
| invoice the balance of a finished move (quote plus variations, less what is already invoiced) | `/invoice` |
| record a payment against an invoice | `/payment` |
| move invoices and deposits overdue, oldest first | `/debtors` |
| draft a reminder listing everything a customer owes | `/draft-reminder` |
| every storage account | `/storage` |
| open a storage account for a booked or finished job | `/store` |
| bill storage monthly in advance for every account due, applying rate changes from their effective date | `/storage-run` |
| the storage overdue ladder | `/storage-arrears` |
| record that an overdue or final notice went to a storage customer | `/storage-notice` |
| draft the next storage notice | `/draft-storage-notice` |
| record that goods in storage were sold or disposed of, once the final notice period has run | `/dispose` |
| close a storage account when the goods go out | `/store-out` |
| storage customers under today's standard rate with no increase in the review period | `/rate-review` |
| schedule a storage rate change, refusing a rise with less than the written notice period | `/raise-rate` |
| storage rate changes, with the notice given for each | `/rate-changes` |
| damage claims with days open and any reply overdue | `/claims` |
| lodge a damage or loss claim against a move | `/claim` |
| record a reply to a claim, or settle or decline it | `/close-claim` |
| win rate and value won by lead source over the last 12 months | `/conversion` |
| quotes lost and why | `/lost-reasons` |
| estimated hours against actual hours on finished moves | `/estimates` |
| everything on one job | `/job` |
| every job with status, move date, volume, total and what is owing | `/jobs` |
| one customer | `/customer` |
| every customer with their jobs and last contact | `/customers` |
| note a call, email or conversation against a customer | `/log` |
| add a customer, truck or crew member | `/add` |
| change a field on a customer, truck, crew member, job, storage account or the company profile | `/set` |
| the company profile | `/profile` |
| bring jobs across from a Moveware job list export. Test run first | `/import` |
| back up every record to one JSON file | `/export` |
| contact history across every customer, newest first | `/activity` |
| every change made through the CLI, with any override reason | `/audit` |
| every invoice with its balance | `/invoices` |
| every payment received | `/payments` |
| storage notices given | `/notices` |
| the Monday review | `/weekly-review` |
| every breach of the rules in docs/compliance.md, with its source | `/compliance` |
| change a rate, a period, a field or a check in plain language | `/customise` |
| add a read-only page to `npm run view` | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run <cli> -- --help`) and then propose a new command for it.

## The rules this business runs by

The checks in `/compliance` and the refusals in the CLI come from `docs/compliance.md`: a written quote before booking, variations in writing, transit insurance offered, subcontracting with consent, high-value items declared, heavy vehicle standard hours, current licences, storage rate notice, written notice before storage goods are sold or disposed of, and claims answered. The periods and limits live on the company profile (`/profile`), so the operator changes them with `set company_profile`, not code. Never use `--override` without the operator's reason in their words; it is written to the audit log.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Moveware.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/moveware
