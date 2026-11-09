---
description: Every job with status, move date, volume, total and what is owing.
---

# /jobs

Run:

```bash
node scripts/removals.mjs jobs
```

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
