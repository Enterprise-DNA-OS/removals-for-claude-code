---
description: Change a field on a customer, truck, crew member, job, storage account or the company profile.
---

# /set

Run:

```bash
node scripts/removals.mjs set <type> <record> '<json>'
```

For the profile (rates, periods, limits): `set company_profile '{"hourly_rate":195}'`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
