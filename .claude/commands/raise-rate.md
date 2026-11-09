---
description: Schedule a storage rate change, refusing a rise with less than the written notice period.
---

# /raise-rate

Run:

```bash
node scripts/removals.mjs raise-rate <account> <new monthly rate> [effective YYYY-MM-DD]
```

Then draft the written notice to the customer.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
