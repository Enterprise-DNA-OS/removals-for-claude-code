---
description: Every open quote with its stage: follow up today, expired but still open, or waiting.
---

# /pipeline

Run:

```bash
node scripts/removals.mjs pipeline
```

Order: follow up today, then expired. For each, offer `/draft-follow-up`, a call note with `/follow-up`, or `/lose` with the reason.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
