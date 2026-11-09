---
description: Cancel a booked move: releases the crew and trucks and flags any deposit to refund or keep.
---

# /cancel

Run:

```bash
node scripts/removals.mjs cancel <job> <reason>
```

Say what happens to the deposit under the operator's terms; do not decide it.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
