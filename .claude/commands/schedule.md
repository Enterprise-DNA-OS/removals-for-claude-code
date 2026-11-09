---
description: The next 14 days of moves: crew booked, trucks, deposit and insurance status.
---

# /schedule

Run:

```bash
node scripts/removals.mjs schedule
```

Flag moves with no crew, a deposit not paid or insurance not asked, nearest first.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
