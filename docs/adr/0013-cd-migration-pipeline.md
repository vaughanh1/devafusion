# CD pipeline runs the first real database migration, gated by manual approval and a temporary named firewall rule

The identity/MFA schema (ADR-0012) needed to actually reach the live
`psql-devafusion-dev-uks` server, and every future schema change needs
the same path without becoming tribal knowledge. `pipelines/cd/web.yml`
gains an `ApplyMigration` stage that requires manual approval on a
dedicated Azure DevOps environment, opens a temporary named PostgreSQL
firewall rule for the CD agent, runs `drizzle-kit migrate`
unconditionally on every run, and always closes that rule again.

## Status
Accepted

## Rationale
- **`drizzle-kit migrate` runs unconditionally on every CD run - no
  git-diff gate.** An earlier draft gated the entire firewall/migrate
  sequence behind detecting whether `src/web/drizzle/**` changed since
  the immediately preceding commit (`git diff HEAD^ HEAD`). That gate
  was removed after recognising a real correctness gap: comparing only
  against the single preceding commit permanently and silently loses
  track of a pending migration if any one CD run is ever rejected at
  the approval gate below, times out, or fails downstream for an
  unrelated reason - no error, just quiet drift between the migration
  files in the repo and what is actually live. `drizzle-kit migrate`
  is already idempotent (it reads `__drizzle_migrations` from the live
  database itself and only applies whatever isn't already recorded
  there), so removing the gate trades a small, fixed, always-paid cost
  (opening and closing the temporary firewall rule on every deploy,
  even when there's nothing to migrate) for eliminating that
  correctness gap entirely. A more precise checkpoint-based gate (a git
  tag moved by CD on every successful run, or a query against the
  last successful `devafusion-web-cd` run via the Azure DevOps REST
  API) was considered and explicitly deferred as a followup rather than
  built now - see Consequences.
- **Detection and gating, while they existed, lived entirely inside one
  job's steps, not across a stage boundary.** An originally designed
  split (a `Migrate` detection stage feeding a `condition` on a later
  `ApplyMigration` stage via a cross-stage output variable) was
  abandoned after four separate documentation searches failed to turn
  up an authoritative Microsoft example of the exact `condition`
  expression syntax needed, before the gate was removed entirely for
  the reason above. This pipeline touches a live production database -
  an unverified expression was not judged an acceptable risk, even
  though the correct syntax (`dependencies.<Stage>.outputs[...]` for
  `condition:`, `stageDependencies.<Stage>.<Job>.outputs[...]` for
  `variables:` - two different context names for the same concept) was
  eventually found in Microsoft's deployment-jobs documentation.
- **The SQL preview happens in CI, not in the gated CD job.** The
  intuitive-looking first design put the "print the pending SQL" step
  inside the same approval-gated deployment job as the migration
  itself - but an Azure DevOps environment approval check pauses a
  deployment job *before any of its steps run*, so that ordering would
  have shown the SQL only *after* approval, defeating the entire point
  of reviewing it first. The preview step lives in
  `pipelines/ci/web.yml`'s `Build` stage instead (zero Azure/DB access,
  runs on every merge already), and - once the git-diff gate above was
  removed - simply prints every migration file currently in the repo
  rather than trying to compute which ones are "new", since CD applies
  whichever of them aren't yet recorded in `__drizzle_migrations`
  regardless. The SQL is visible in the triggering CI run's log before
  the CD environment's approval gate is ever reached.
- **Manual approval on a dedicated environment
  (`devafusion-dev-migrations`), not the existing `devafusion-dev`.**
  Reusing the app-deploy environment would either force every ordinary
  deploy through the same manual gate (defeating the whole point of
  gating only migrations) or require the gate to somehow apply
  conditionally to one stage's job only, which Azure DevOps environment
  checks don't support - checks are configured per-environment, not
  per-stage. A dedicated environment is a clean, one-time manual setup
  step (Azure DevOps UI, not expressible in YAML) that isolates the
  approval to exactly the stage that needs it.
- **Reused Microsoft's own documented temporary-firewall-rule pattern**
  (`Azure/postgresql-action`'s GitHub Action: auto-detect the runner's
  IP, add a named exception, delete it after) rather than any of the
  alternatives already rejected earlier this session (wide-open
  `0.0.0.0` rule, permanent CD-agent-range allowlisting, a persistent
  VNet-integrated self-hosted agent).
- **`az` password percent-encoding**: the admin password is
  percent-encoded via `python3 -c "...urllib.parse.quote..."` before
  being interpolated into the `postgresql://` connection string,
  mirroring `web.tf`'s own `urlencode(...)` - the raw secret may contain
  characters (`@`, `:`, `/`, `%`) that would otherwise corrupt the URL.
  `python3` is preinstalled on the `ubuntu-latest` hosted image, so no
  new dependency was needed.

- **Retry with exponential backoff around `drizzle-kit migrate` itself,
  not a blind fixed sleep after opening the firewall rule.** Confirmed
  as a real failure on the first actual production run of this
  pipeline: `az postgres flexible-server firewall-rule create` returns
  success as soon as Azure accepts the request, well before the rule
  has actually propagated - Microsoft's own docs state firewall
  configuration changes "can take up to five minutes." `drizzle-kit
  migrate` connected immediately afterward and failed fast (~270ms) on
  what is consistent with a network-level rejection, not a timeout. A
  bounded retry loop (6 attempts, 10s initial delay doubling each time,
  ~5 minutes total worst case matching Microsoft's documented figure)
  wraps the migrate call, since propagation is frequently much faster
  than the worst case in practice and a blind fixed sleep would always
  pay the worst-case cost.

## Considered Options
- **`git diff HEAD^ HEAD`-based gate on the migrate sequence** -
  rejected; see Rationale (silent, permanent drift on any single
  rejected/failed/timed-out run).
- **Wider N-commit lookback window as a partial fix to the above** -
  considered as a stopgap, then rejected in favour of removing the
  gate entirely once the always-run/idempotent-migrate tradeoff was
  accepted - a wider fixed window narrows the failure mode without
  eliminating it.
- **Checkpoint-based gate** (a git tag moved by CD on every successful
  `ApplyMigration` run, compared against on the next run; or a query
  against the last successful `devafusion-web-cd` run via the Azure
  DevOps REST API) - the theoretically correct fix, explicitly deferred
  as a followup rather than built now. The tag approach needs the CD
  pipeline granted git write-back access it doesn't currently have
  (`System.AccessToken` with push scope, or an equivalent PAT) - a
  deliberate permission-surface change not taken lightly for a pipeline
  already touching production infrastructure.
- **Cross-stage output-variable condition** (a `Migrate` stage sets a
  variable, `ApplyMigration` stage's `condition` reads it) - rejected;
  see Rationale.
- **SQL preview inside the same gated job as the migration** -
  rejected; see Rationale (wrong ordering relative to the approval
  check).
- **Reusing the existing `devafusion-dev` environment's approval check**
  for this stage - rejected; would gate every ordinary deploy, not just
  migrations.
- **`postgres-js`/other driver-level dry-run or `--pretend` flag on
  `drizzle-kit migrate`** - confirmed against Drizzle's own docs that no
  such flag exists; printing the current migration SQL in CI is the
  closest equivalent available.

## Consequences
- **One-time manual setup required, not yet done**: create the
  `devafusion-dev-migrations` environment in Azure DevOps and add a
  manual approval check naming the approvers, before this pipeline's
  `ApplyMigration` stage can run for the first time.
- **Every CD run now pays the firewall-rule open/close cost, not just
  ones with a real migration.** Accepted deliberately in exchange for
  eliminating the silent-drift correctness gap - not free, and worth
  revisiting if that cost becomes material to normal deploy latency.
- **Followup, not yet scheduled: build the checkpoint-based gate**
  (git tag or REST API query - see Considered Options) to restore
  skip-when-nothing-pending behaviour without reintroducing the
  correctness gap the original `HEAD^ HEAD` gate had.
- **`sc-devafusion-terraform`'s firewall-rule RBAC permission is now
  confirmed, not just inferred** - the firewall rule create/delete
  steps both succeeded on the first real `ApplyMigration` run (the
  migrate step itself is what failed, on firewall-rule propagation
  delay - see the retry-with-backoff rationale above), proving the
  custom Terraform deployment role's `Microsoft.DBforPostgreSQL/
  flexibleServers/*` wildcard does cover the child `firewallRules`
  action as expected.
- The identity/MFA schema from ADR-0012
  (`0000_better_auth_identity_and_mfa.sql`) is the first migration this
  pipeline will actually apply to the live server - the first real run
  failed on firewall-rule propagation delay (now fixed with retry
  logic above), so it has still not yet successfully applied as of
  this revision.
- Every future schema change follows the same path automatically: land
  a new `drizzle-kit generate`-produced file under `src/web/drizzle/`,
  merge, review the printed SQL in the triggering CI run, approve the
  `devafusion-dev-migrations` environment gate.

## Related
- ADR-0012 (Better Auth identity layer - the first real consumer of
  this pipeline)
- ADR-0010 (PostgreSQL Flexible Server, firewall-rule conventions)
- `infrastructure/AGENTS.md` §PostgreSQL
- `src/web/AGENTS.md` §Local Postgres for Migration Testing
