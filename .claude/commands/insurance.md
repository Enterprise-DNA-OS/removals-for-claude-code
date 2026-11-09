---
description: Record the customer's answer on transit insurance and the insured value.
---

# /insurance

Run:

```bash
node scripts/removals.mjs insurance <job> taken|declined --value=<insured value>
```

Every booked move needs an answer before the day.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
