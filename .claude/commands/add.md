---
description: Add a customer, truck or crew member.
---

# /add

Run:

```bash
node scripts/removals.mjs add <customers|trucks|crew> '<json>'
```

Jobs start with `/enquiry`, storage with `/store`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
