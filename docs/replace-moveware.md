# Moving off Moveware

## 1. Export

In Moveware, run a job list report for the period you want (for example every job from the last two years plus everything open) and export it to Excel. Save it as CSV. Moveware reports are set up per business, so your columns may differ from the sample in `fixtures/moveware-job-list.csv`; the import accepts the usual names for each field.

| What it is | Columns the import recognises |
|---|---|
| Job number (required) | Job No, Job Number, Job, Job ID, Removal No, File No, Reference |
| Customer (required) | Customer, Customer Name, Client, Client Name, Shipper, Name, or First Name and Last Name, or Company |
| Status (required) | Status, Job Status, Stage. Enquiry or Lead; Quote, Quoted or Estimate; Booked, Confirmed or Accepted; Completed, Delivered, Invoiced or Closed; Lost or Declined; Cancelled |
| Type of move | Job Type, Type, Move Type, Service (international, interstate, country, office and storage are recognised; the rest are local) |
| Contact | Email, Mobile, Phone |
| Addresses | Origin, From Address, Pickup Address, Uplift Address; Destination, To Address, Delivery Address |
| Dates | Enquiry Date or Created; Quote Date or Estimate Date; Move Date, Removal Date, Uplift Date, Load Date |
| Money and size | Quote Amount, Quoted Price, Estimate, Total; Volume (m3), Cubic Metres, CBM, or Cubic Feet (converted); Estimated Hours |
| Storage | Storage (yes or no), Storage Rate |
| Sales | Lead Source, Lost Reason |

## 2. Test run

```bash
node scripts/removals.mjs import moveware jobs.csv --dry-run --date-order=DMY
```

`--date-order` is needed when dates look like 03/11/2026. The test run writes nothing and reports what it would create. A bad row stops the whole file with the row number, so nothing half-loads.

## 3. Load

```bash
node scripts/removals.mjs import moveware jobs.csv --date-order=DMY
```

Running the same file again updates jobs by job number and never duplicates them, so you can re-import the latest report each day while you run both systems.

## What carries over

- Customers (matched to existing ones by email, then by name), jobs with their numbers, type, addresses, dates, status, quote amount, estimated hours, storage flag and rate, lead source and lost reason.
- The job's total volume, as one "Imported volume" line on its inventory.
- `quoted_without_quote_date` in the result counts quotes with no quote date. Those show under WRITTEN-QUOTE in `/compliance` until you confirm the quote was sent.

## What does not

- Room-by-room inventories and survey photos. Re-survey open jobs, or export the inventory report and ask Claude Code to map it.
- Crew and truck allocations, timesheets and payroll (Moveware's Australian payroll stays where it is).
- Invoices, payments and storage billing history. Ask Claude Code to load your aged debtors report as opening invoices, and keep Moveware read-only for history.
- Storage accounts. Open each with `store` from its job, or ask Claude Code to map Moveware's storage report.
- International export and import paperwork, customs registers and agent accounts.

Enterprise DNA does this mapping for you as part of a switch.
