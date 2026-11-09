---
description: Damage claims with days open and any reply overdue.
---

# /claims

Run:

```bash
node scripts/removals.mjs claims
```

Unanswered ones first.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
