---
description: Will each booked move fit its trucks? Volume against the capacity of the trucks allocated.
---

# /cube

Run:

```bash
node scripts/removals.mjs cube
```

For "will not fit", suggest a bigger truck or a second load, with the free trucks that day from `/trucks`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
