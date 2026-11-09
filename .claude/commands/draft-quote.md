---
description: Write the customer's written quote: addresses, date, inventory with cubic metres, price, storage rate, deposit, validity and the high-value and insurance lines.
---

# /draft-quote

Run:

```bash
node scripts/removals.mjs draft-quote <job>
```

Show the file path and the price line. Never send. Once the operator has sent it, nothing else is needed: the quote date is already recorded.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
