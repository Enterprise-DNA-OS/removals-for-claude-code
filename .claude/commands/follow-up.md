---
description: Log a follow-up on a quote: what the customer said.
---

# /follow-up

Run:

```bash
node scripts/removals.mjs follow-up <job> <what was said>
```

Records the date so the pipeline stops asking. Note anything that changes the quote.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
