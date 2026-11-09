<h1 align="center">Removals for Claude Code</h1>

<p align="center">
  <strong>The open-source removals and storage system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Moveware data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=moveware">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/moveware?utm_source=github&utm_medium=readme&utm_campaign=moveware">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-moveware">Instead of Moveware</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Removals for Claude Code does the job you pay Moveware for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Moveware dashboard cannot.

Moveware does not publish a price list. Each mover is quoted, and Moveware's own representative once put the all-in cost at about a week's wages per office operator per year ([The Mover, 2015](https://www.themover.co.uk/news/2015/05/18/moveware-suits-you-sir!)), with surveys, the crew app, storage and international work sold as modules.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=moveware).

It covers the work of an owner-run removals and storage business in Australia or New Zealand: enquiries, video and in-home surveys with a room-by-room inventory, quotes from estimated hours, follow-ups, bookings with deposits, crew and trucks by the day, variations, invoicing, containerised storage billed monthly, the storage overdue ladder, and damage claims. It checks the rules the business works under as it goes: a written quote before booking, changes agreed in writing, transit insurance offered, subcontracting only with consent, heavy vehicle fatigue hours, current licences, notice before a storage rate rise, and written notice before goods in storage are sold or disposed of.

### Ten questions Moveware cannot answer for you

Each is one command on your own records today.

1. Which quotes are due a follow-up today, and which have expired but are still open? (`/pipeline`)
2. Which lead source wins the most value, and which loses the most quotes? (`/conversion`)
3. Do our estimators run over or under on hours, and on which kinds of move? (`/estimates`)
4. Who is rostered past the 12 hour heavy vehicle fatigue limit in the next fortnight? (`/diary`)
5. Which driver's licence lapses before their next driving day? (`/licences`)
6. Which booked moves will not fit the trucks allocated to them? (`/cube`)
7. Which finished moves are not fully invoiced, including variations? (`/unbilled`)
8. Which storage customers are due an overdue or final notice, and whose goods may now be disposed of? (`/storage-arrears`)
9. Which long-term storage customers pay under today's rate, and what is the monthly gap? (`/rate-review`)
10. Which booked moves have a subcontractor with no written consent, a high-value item not declared, or no insurance answer? (`/compliance`)

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/removals-for-claude-code.git
cd removals-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. The demo is a fictional Sydney mover with an unanswered enquiry, an expired quote still open, a move tomorrow with no crew, a driver rostered 13 hours, an undeclared piano and storage accounts at every step of the overdue ladder.

### Your first hour: ten things to ask for

1. "Set our hourly rate to $195 and the deposit to 25%." (`/customise`)
2. "Import our Moveware job list, test run first." (`/import`)
3. "What needs doing today?" (`/attention`)
4. "Which quotes should I chase?" (`/pipeline`)
5. "Draft the written quote for MOV-1003." (`/draft-quote`)
6. "Show me the fortnight and who is on each move." (`/schedule`, `/diary`)
7. "Put Sean and Mia on MOV-1008 tomorrow in Truck 1." (`/allocate`)
8. "Run the storage billing." (`/storage-run`)
9. "Who is behind on storage and what is the next notice?" (`/storage-arrears`)
10. "Give me the Monday review." (`/weekly-review`)

`npm run view` renders read-only pages (the fortnight, quotes and wins, storage) and `npm run docs` renders quotes, crew run sheets, storage statements and final notices in your brand from `brand.json`.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything that needs a person today: unanswered enquiries, quotes to chase, moves with no crew or no deposit, fatigue and licence problems, money owed, storage arrears and unanswered claims. |
| `/enquiries` | Open enquiries not yet quoted, oldest first, with how long each has waited for a reply. |
| `/enquiry` | Take a new enquiry: customer, type of move, move date, addresses and where they heard of you. |
| `/survey` | Record a video or in-home survey for a job, and build its inventory room by room. |
| `/item` | Add an item to a job's inventory with its cubic metres, quantity, room and value. |
| `/declare` | Record that the customer has declared a high-value item in writing. |
| `/quote` | Price a job from its estimated hours at your hourly rate, or at a figure you give, and set the quote's expiry. |
| `/draft-quote` | Write the customer's written quote: addresses, date, inventory with cubic metres, price, storage rate, deposit, validity and the high-value and insurance lines. |
| `/pipeline` | Every open quote with its stage: follow up today, expired but still open, or waiting. |
| `/follow-up` | Log a follow-up on a quote: what the customer said. |
| `/draft-follow-up` | Draft a follow-up email for an open quote. |
| `/accept` | Book a quoted job: checks the written quote went out and has not expired, sets the deposit and raises the deposit invoice. |
| `/lose` | Mark an open enquiry or quote lost, with the reason. |
| `/cancel` | Cancel a booked move: releases the crew and trucks and flags any deposit to refund or keep. |
| `/insurance` | Record the customer's answer on transit insurance and the insured value. |
| `/consent` | Record the customer's written consent to a subcontracted carrier (linehaul, another removalist). |
| `/schedule` | The next 14 days of moves: crew booked, trucks, deposit and insurance status. |
| `/diary` | Crew hours by day for the next 14 days, with heavy vehicle drivers over the fatigue limit flagged. |
| `/allocate` | Put a crew member (and a truck) on a job for a day: checks licences, the fatigue limit and truck clashes. |
| `/cube` | Will each booked move fit its trucks? Volume against the capacity of the trucks allocated. |
| `/crew` | Crew list with roles, licences and days booked in the next fortnight. |
| `/trucks` | Trucks with GVM, cubic capacity and days booked in the next fortnight. |
| `/licences` | Drivers whose licence has lapsed or lapses within the warning period, with their next driving day. |
| `/high-value` | High-value items on open jobs with no written declaration. |
| `/variation` | Record a change to a booked or finished move: extra goods, an extra pickup, more hours, and how it was agreed. |
| `/variations` | Every variation with how it was agreed. |
| `/complete` | Close a move with the actual hours worked; shows the balance to invoice. |
| `/unbilled` | Finished moves not fully invoiced. |
| `/invoice` | Invoice the balance of a finished move (quote plus variations, less what is already invoiced). |
| `/payment` | Record a payment against an invoice. |
| `/debtors` | Move invoices and deposits overdue, oldest first. |
| `/draft-reminder` | Draft a reminder listing everything a customer owes. |
| `/storage` | Every storage account: containers, location, rate, billed to and what is owing. |
| `/store` | Open a storage account for a booked or finished job: containers, monthly rate and location. |
| `/storage-run` | Bill storage monthly in advance for every account due, applying rate changes from their effective date. |
| `/storage-arrears` | The storage overdue ladder: who needs an overdue notice, a final notice, and whose goods may now be sold or disposed of. |
| `/storage-notice` | Record that an overdue or final notice went to a storage customer. |
| `/draft-storage-notice` | Draft the next storage notice: overdue, or final once the account qualifies. |
| `/dispose` | Record that goods in storage were sold or disposed of, once the final notice period has run. |
| `/store-out` | Close a storage account when the goods go out. |
| `/rate-review` | Storage customers under today's standard rate with no increase in the review period. |
| `/raise-rate` | Schedule a storage rate change, refusing a rise with less than the written notice period. |
| `/rate-changes` | Storage rate changes, with the notice given for each. |
| `/claims` | Damage claims with days open and any reply overdue. |
| `/claim` | Lodge a damage or loss claim against a move. |
| `/close-claim` | Record a reply to a claim, or settle or decline it. |
| `/conversion` | Win rate and value won by lead source over the last 12 months. |
| `/lost-reasons` | Quotes lost and why. |
| `/estimates` | Estimated hours against actual hours on finished moves. |
| `/job` | Everything on one job: details, inventory, variations, crew, invoices and claims. |
| `/jobs` | Every job with status, move date, volume, total and what is owing. |
| `/customer` | One customer: their jobs, storage, invoices and contact history. |
| `/customers` | Every customer with their jobs and last contact. |
| `/log` | Note a call, email or conversation against a customer. |
| `/add` | Add a customer, truck or crew member. |
| `/set` | Change a field on a customer, truck, crew member, job, storage account or the company profile. |
| `/profile` | The company profile: rates, deposit, quote validity and every period and limit the checks use. |
| `/import` | Bring jobs across from a Moveware job list export. Test run first. |
| `/export` | Back up every record to one JSON file. |
| `/activity` | Contact history across every customer, newest first. |
| `/audit` | Every change made through the CLI, with any override reason. |
| `/invoices` | Every invoice with its balance. |
| `/payments` | Every payment received. |
| `/notices` | Storage notices given. |
| `/weekly-review` | The Monday review: the fortnight, quotes, money, compliance and three actions. |
| `/compliance` | Every breach of the rules in docs/compliance.md, with its source. |
| `/customise` | Change a rate, a period, a field or a check in plain language. |
| `/new-view` | Add a read-only page to `npm run view`. |

## Instead of Moveware

Export a job list report from Moveware to Excel, save it as CSV, and run `node scripts/removals.mjs import moveware jobs.csv --dry-run --date-order=DMY`. It brings customers, jobs, addresses, dates, status, quote amounts, volumes and storage flags. A second run updates rather than duplicates. Inventories, crew history, invoices and storage billing history are not in that report: [docs/replace-moveware.md](docs/replace-moveware.md) says what maps and what does not.

## Architecture

```
removals-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Removals for Claude Code for your business, migrates your Moveware data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=moveware)
- Read more: [enterprisedna.co/omni/instead-of/moveware](https://enterprisedna.co/omni/instead-of/moveware?utm_source=github&utm_medium=readme&utm_campaign=moveware)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
