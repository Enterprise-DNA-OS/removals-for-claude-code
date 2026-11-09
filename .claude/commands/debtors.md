---
description: Move invoices and deposits overdue, oldest first.
---

# /debtors

Run:

```bash
node scripts/removals.mjs debtors
```

Offer `/draft-reminder` for each customer.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
