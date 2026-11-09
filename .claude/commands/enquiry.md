---
description: Take a new enquiry: customer, type of move, move date, addresses and where they heard of you.
---

# /enquiry

Run:

```bash
node scripts/removals.mjs enquiry "<customer>" <local|country|interstate|international|office|storage> <YYYY-MM-DD> --from="<address>" --to="<address>" --email=<email> --phone=<phone> --source=<source>
```

Read back the job number. A new customer is created when the name does not match exactly. Ask for the source every time: it feeds `/conversion`.

Use `--json` when combining results. On an ambiguous name, list the candidates and ask; never pick the first. Nothing here sends a message, takes a payment or moves a truck.
