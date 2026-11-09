---
description: Crew hours by day for the next 14 days, with heavy vehicle drivers over the fatigue limit flagged.
---

# /diary

Run:

```bash
node scripts/removals.mjs diary
```

Any flagged day comes first with a suggested fix (split the day, swap the driver).

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
