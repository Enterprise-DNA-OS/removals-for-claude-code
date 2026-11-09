---
description: Record a video or in-home survey for a job, and build its inventory room by room.
---

# /survey

Run:

```bash
node scripts/removals.mjs survey <job> <video|in-home> [YYYY-MM-DD]
```

Then add each item with `node scripts/removals.mjs item <job> "<item>" <m3 each> --qty=<n> --room=<room> --value=<value>`. Ask the customer about anything worth more than the high-value limit and record its value.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
