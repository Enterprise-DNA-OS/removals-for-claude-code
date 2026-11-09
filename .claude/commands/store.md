---
description: Open a storage account for a booked or finished job: containers, monthly rate and location.
---

# /store

Run:

```bash
node scripts/removals.mjs store <job> <containers> <monthly rate> --location=<bay and row> [--standard=<standard rate>]
```

Billing starts today; run `/storage-run` to raise the first invoice.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
