# Vitest + Playwright + Docker-pinned visual regression as the three-tier testing gate

The web application's automated testing is split into three tiers: Vitest
for unit/component tests (v8 coverage, LCOV/JUnit reporting), Playwright for
E2E specs against a locally built standalone server, and a separate
Playwright visual-regression suite that runs only inside the official,
version-pinned `mcr.microsoft.com/playwright` Docker image — never on the
bare hosted CI agent or a contributor's local OS.

## Status
Accepted

## Considered Options
- Running visual-regression screenshot assertions in the same job/project
  as ordinary E2E specs on the bare Ubuntu hosted agent — rejected. Font
  rendering differs between a contributor's local OS (Windows/macOS) and
  the cloud runner's font stack, which produces false-positive diffs
  unrelated to any real regression. The pinned Docker image guarantees the
  exact same font stack every time, locally and in CI.
- Chasing 100% coverage as a hard gate — rejected; the Coverage Target
  section of `src/web/__tests__/AGENTS.md` explicitly targets honest
  coverage of business logic (parsing, validation, formatting) over a
  vanity percentage, since a passthrough JSX wrapper gains nothing from a
  forced test.

## Consequences
- Any new `*.visual.spec.ts` baseline PNG must be generated inside that
  same pinned Docker image (documented bootstrap procedure in
  `src/web/__tests__/AGENTS.md`) — a locally-rendered baseline PNG
  committed from a bare Windows/macOS Playwright run is not valid and will
  cause a false-positive CI failure, as very nearly happened in this
  session's own About/footer UX change before the baseline was correctly
  regenerated through the Docker image.
- The `E2ETests` CI job currently has no `--grep` filter excluding
  `@visual` specs, so it incidentally also runs the visual spec against
  the bare (non-Docker) agent — a known, currently-unaddressed gap flagged
  during this session, not yet fixed.
