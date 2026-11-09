---
description: The Monday review for the owner or ops manager, written from the fortnight's moves, the quote pipeline, money owed, storage arrears and win rates.
---

# /weekly-review

Run:

```bash
node scripts/removals.mjs weekly-review --json
node scripts/removals.mjs attention --json
node scripts/removals.mjs compliance --json
```

Write it in five short sections: the fortnight (moves, crew gaps, fatigue), quotes (to chase, expired, won and lost last week), money (overdue invoices, not invoiced, storage arrears), compliance (any breach, with the rule), and three named actions for this week with who does each. Numbers in tables. Nothing is sent.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
