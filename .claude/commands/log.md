---
description: Note a call, email or conversation against a customer.
---

# /log

Run:

```bash
node scripts/removals.mjs log <customer> <note>
```

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
