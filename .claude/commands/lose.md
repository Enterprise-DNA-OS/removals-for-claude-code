---
description: Mark an open enquiry or quote lost, with the reason.
---

# /lose

Run:

```bash
node scripts/removals.mjs lose <job> <reason>
```

Always ask for the reason in the customer's words (price, timing, went with someone else). It feeds `/lost-reasons`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
