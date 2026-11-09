---
description: Bill storage monthly in advance for every account due, applying rate changes from their effective date.
---

# /storage-run

Run:

```bash
node scripts/removals.mjs storage-run
```

Run weekly. Never bills an account twice for the same month.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
