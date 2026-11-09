---
description: Book a quoted job: checks the written quote went out and has not expired, sets the deposit and raises the deposit invoice.
---

# /accept

Run:

```bash
node scripts/removals.mjs accept <job>
```

If it refuses because there is no written quote or the quote expired, offer `/draft-quote` or a re-quote. Use `--override="reason"` only on the operator's word. Then ask about transit insurance (`/insurance`).

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
