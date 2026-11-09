---
description: Record that an overdue or final notice went to a storage customer.
---

# /storage-notice

Run:

```bash
node scripts/removals.mjs storage-notice <account> overdue|final [email|post|sms|hand]
```

Only after it has been sent. The final notice starts the wait before any sale or disposal.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
