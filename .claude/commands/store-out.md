---
description: Close a storage account when the goods go out.
---

# /store-out

Run:

```bash
node scripts/removals.mjs store-out <account>
```

Say what is owing and any unused days billed.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
