---
description: Record that goods in storage were sold or disposed of, once the final notice period has run.
---

# /dispose

Run:

```bash
node scripts/removals.mjs dispose <account>
```

Refuses before the wait is over or with no final notice. Then log what happened to the goods and any surplus with `/log`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
