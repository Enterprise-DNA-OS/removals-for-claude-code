---
description: Record a reply to a claim, or settle or decline it.
---

# /close-claim

Run:

```bash
node scripts/removals.mjs close-claim <claim> replied|settled|declined [amount] [outcome]
```

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
