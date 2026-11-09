---
description: Add an item to a job's inventory with its cubic metres, quantity, room and value.
---

# /item

Run:

```bash
node scripts/removals.mjs item <job> "<item>" <m3 each> --qty=<n> --room=<room> --value=<value>
```

Show the new job volume. If the item is high value, say it needs a written declaration and offer `/declare`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
