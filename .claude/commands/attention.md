---
description: Everything that needs a person today: unanswered enquiries, quotes to chase, moves with no crew or no deposit, fatigue and licence problems, money owed, storage arrears and unanswered claims.
---

# /attention

Run:

```bash
node scripts/removals.mjs attention
```

Group by who acts: the office (enquiries, quotes, invoices, storage), the ops manager (crew, trucks, fatigue, licences), the owner (claims, disposals). Lead with anything moving in the next 3 days. For each, name the command that fixes it.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
