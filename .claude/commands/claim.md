---
description: Lodge a damage or loss claim against a move.
---

# /claim

Run:

```bash
node scripts/removals.mjs claim <job> <amount claimed> <item and damage>
```

Ask for photos and the inventory line. Check `/job` for insurance.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
