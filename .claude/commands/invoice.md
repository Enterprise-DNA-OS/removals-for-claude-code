---
description: Invoice the balance of a finished move (quote plus variations, less what is already invoiced).
---

# /invoice

Run:

```bash
node scripts/removals.mjs invoice <job>
```

Refuses while a variation is verbal only. Override only on the operator's word.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
