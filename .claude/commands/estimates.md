---
description: Estimated hours against actual hours on finished moves.
---

# /estimates

Run:

```bash
node scripts/removals.mjs estimates
```

Say whether the estimators run over or under, by how much, and on which kinds of move.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
