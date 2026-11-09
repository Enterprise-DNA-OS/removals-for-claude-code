---
description: Record that the customer has declared a high-value item in writing.
---

# /declare

Run:

```bash
node scripts/removals.mjs declare <job> "<item>"
```

Only after the written declaration is on file (email or signed form). Ask where it is filed and log it.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
