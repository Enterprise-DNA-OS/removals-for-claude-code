---
description: Record a payment against an invoice.
---

# /payment

Run:

```bash
node scripts/removals.mjs payment <invoice> <amount> <bank reference>
```

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
