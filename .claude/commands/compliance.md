---
description: Check the records against the rules a removals and storage business works under (written quotes, variations in writing, transit insurance, subcontract consent, high-value declarations, heavy vehicle fatigue hours, licences, storage rate notices, uncollected goods, claims) and report every breach with its source.
---

# /compliance

Run:

```bash
node scripts/removals.mjs compliance --json
```

1. Group by rule, worst first: fatigue and licences (people on the road), then uncollected goods and storage notices (legal exposure), then quotes, variations, insurance and consent, then claims.
2. For each breach, give the record, what is wrong and the fix: the command to run or the draft to write (to `drafts/`, never sent).
3. The rules, their sources and the settings that drive them are in `docs/compliance.md`. If a rule looks out of date or does not match the operator's state, terms or New Zealand, say so and stop. The operator confirms, then you change the setting with `set company_profile`, or the rule and the doc together.

Nothing here is legal advice. It checks the records against the rules the operator has told the system to enforce.
