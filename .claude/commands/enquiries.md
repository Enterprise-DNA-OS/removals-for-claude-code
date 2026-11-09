---
description: Open enquiries not yet quoted, oldest first, with how long each has waited for a reply.
---

# /enquiries

Run:

```bash
node scripts/removals.mjs enquiries
```

Anything at "reply overdue" goes first. Offer `/survey` for big moves and `/quote` once the hours are known.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
