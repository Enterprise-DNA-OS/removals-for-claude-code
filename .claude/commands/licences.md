---
description: Drivers whose licence has lapsed or lapses within the warning period, with their next driving day.
---

# /licences

Run:

```bash
node scripts/removals.mjs licences
```

Anyone driving after their licence expires goes first.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
