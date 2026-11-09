---
description: Put a crew member (and a truck) on a job for a day: checks licences, the fatigue limit and truck clashes.
---

# /allocate

Run:

```bash
node scripts/removals.mjs allocate <job> <crew> <YYYY-MM-DD> <hours> --truck=<truck> [--driving]
```

If it refuses on fatigue or licence, offer another driver from `/crew`. Never override a fatigue refusal without the operator saying so.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
