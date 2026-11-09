---
description: Draft a reminder listing everything a customer owes.
---

# /draft-reminder

Run:

```bash
node scripts/removals.mjs draft-reminder <customer>
```

Never send.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
