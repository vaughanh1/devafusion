# Hub-and-Spoke AGENTS.md documentation structure

Engineering standards are split into one universal root `AGENTS.md` (Hub) —
covering persona, git discipline, the pre-flight validation gate, and the
PR pipeline — plus stack-specific Spoke files
(`src/web/AGENTS.md`, `infrastructure/AGENTS.md`,
`src/web/__tests__/AGENTS.md`) that hold only the rules specific to that
stack. A reusable `.templates/module.agent.md` exists for instantiating a
future module's spoke (e.g. an eventual Auth module) without editing the
Hub.

## Status
Accepted

## Considered Options
- One large, monolithic root `AGENTS.md` covering every stack — rejected;
  it was already becoming unwieldy and would need editing every time an
  unrelated stack (e.g. a future mobile app) was added, even though its
  universal rules never change.

## Consequences
- A rule that spans stacks belongs in the Hub; a rule specific to one
  stack's tooling belongs in that stack's Spoke — this distinction must be
  maintained deliberately, not collapsed back into one file as the project
  grows.
- Adding a new module means copying `.templates/module.agent.md` and adding
  an entry to the Hub's Spoke Index, never editing the Hub's own rule
  content.
