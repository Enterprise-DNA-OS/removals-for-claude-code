---
description: Record the customer's written consent to a subcontracted carrier (linehaul, another removalist).
---

# /consent

Run:

```bash
node scripts/removals.mjs consent <job> [subcontractor]
```

Only once the consent is in writing. Ask where it is filed.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
