# Fixtures

A sample Moveware job list used by `npm test`, with fictional people. Moveware exports its reports to Excel; this is a job list report saved as CSV. Report layouts are set up per business, so the importer accepts the usual names for each field (see `docs/replace-moveware.md`) and ignores columns it does not use.

- `moveware-job-list.csv`: DMY dates, money with thousands separators, a quoted name with a comma, a job of every status, a storage job with its monthly rate, a lost job with its reason, and an existing customer matched by email.
