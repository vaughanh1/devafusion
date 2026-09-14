# One file per engineering log entry, not a shared array

Each engineering log entry lives in its own file under
`src/web/features/log/entries/<slug>.ts`, exporting a single `LogEntry`.
`engineering-log.ts` is a thin barrel that imports and aggregates every
entry file and sorts them by date. The log was originally a single shared
array of entries in one file.

## Status
Accepted (supersedes the original single-array structure)

## Considered Options
- A single shared `LogEntry[]` array in one file — this was the original
  structure. Rejected after it caused a real merge conflict: two branches
  in flight at the same time both appended to the same array tail. The
  defect was the shared, append-only array itself as a collision surface,
  not how frequently entries were added.

## Consequences
- Any new engineering log entry is always a new file, never an edit to an
  existing entry file or to the shared array pattern this replaced.
- This same "one file per addition, never a shared append-only array"
  principle should be the default answer whenever a similar collision risk
  shows up elsewhere in the codebase (e.g. a future ADR index, if ADRs ever
  need machine-readable aggregation).
