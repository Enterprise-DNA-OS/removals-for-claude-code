---
description: Bring jobs across from a Moveware job list export. Test run first.
---

# /import

Run:

```bash
node scripts/removals.mjs import moveware <job-list.csv> --dry-run --date-order=DMY
```

Always dry run first and read the counts back. Then run it without `--dry-run`. See docs/replace-moveware.md.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
