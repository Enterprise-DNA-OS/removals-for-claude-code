---
description: Price a job from its estimated hours at your hourly rate, or at a figure you give, and set the quote's expiry.
---

# /quote

Run:

```bash
node scripts/removals.mjs quote <job> [amount] --hours=<estimated hours> [--storage-rate=<monthly>]
```

Read out any note: a large move with no survey, no inventory, or storage with no storage rate. Then offer `/draft-quote` so the written quote goes out.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
