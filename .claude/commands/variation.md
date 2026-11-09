---
description: Record a change to a booked or finished move: extra goods, an extra pickup, more hours, and how it was agreed.
---

# /variation

Run:

```bash
node scripts/removals.mjs variation <job> <amount> <what changed> --how=email|signed|sms|verbal
```

A verbal variation is flagged until confirmed in writing; invoicing waits for it.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
