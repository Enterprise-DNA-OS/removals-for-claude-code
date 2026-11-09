---
description: Close a move with the actual hours worked; shows the balance to invoice.
---

# /complete

Run:

```bash
node scripts/removals.mjs complete <job> <actual hours>
```

If it ran over the estimate, ask whether to add a variation before invoicing.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
