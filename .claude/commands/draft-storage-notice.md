---
description: Draft the next storage notice: overdue, or final once the account qualifies.
---

# /draft-storage-notice

Run:

```bash
node scripts/removals.mjs draft-storage-notice <account>
```

Never send. Record it once sent with `/storage-notice`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
