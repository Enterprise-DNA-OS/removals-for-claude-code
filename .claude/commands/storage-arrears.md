---
description: The storage overdue ladder: who needs an overdue notice, a final notice, and whose goods may now be sold or disposed of.
---

# /storage-arrears

Run:

```bash
node scripts/removals.mjs storage-arrears
```

Offer `/draft-storage-notice` for the next step. Disposal is the owner's decision, after advice.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
