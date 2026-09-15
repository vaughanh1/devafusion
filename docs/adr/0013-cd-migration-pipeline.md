# CD pipeline runs the first real database migration, gated by manual approval and a temporary named firewall rule

The identity/MFA schema (ADR-0012) needed to actually reach the live
`psql-devafusion-dev-uks` server, and every future schema change needs
the same path without becoming tribal knowledge. `pipelines/cd/web.yml`
gains an `ApplyMigration` stage that detects a pending migration,
requires manual approval on a dedicated Azure DevOps environment, opens
a temporary named PostgreSQL firewall rule for the CD agent, runs
`drizzle-kit migrate`, and always closes that rule again.

## Status
Accepted

## Rationale
- **Detection and gating live entirely inside one job's steps, not
  across a stage boundary.** The originally designed split (a
  `Migrate` detection stage feeding a `condition` on a later
  `ApplyMigration` stage via a cross-stage output variable) was
  abandoned after four separate documentation searches failed to turn
  up an authoritative Microsoft example of the exact `condition`
  expression syntax needed. This pipeline touches a live production
  database - an unverified expression is not an acceptable risk here,
  even though the correct syntax (`dependencies.<Stage>.outputs[...]`
  for `condition:`, `stageDependencies.<Stage>.<Job>.outputs[...]` for
  `variables:` - two different context names for the same concept) was
  eventually found in Microsoft's deployment-jobs documentation. Every
  gated step within `ApplyMigration`'s single job instead checks a
  plain same-job variable (`migrationPending`), which needed no
  cross-stage syntax at all.
- **The SQL preview happens in CI, not in the gated CD job.** The
  intuitive-looking first design put the "print the pending SQL" step
  inside the same approval-gated deployment job as the migration
  itself - but an Azure DevOps environment approval check pauses a
  deployment job *before any of its steps run*, so that ordering would
  have shown the SQL only *after* approval, defeating the entire point
  of reviewing it first. The preview step lives in
  `pipelines/ci/web.yml`'s `Build` stage instead (zero Azure/DB access,
  runs on every merge already), so the SQL is visible in the triggering
  CI run's log before the CD environment's approval gate is ever
  reached.
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

## Considered Options
- **Cross-stage output-variable condition** (`Migrate` stage sets a
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
  such flag exists; the SQL-file-content preview is the closest
  equivalent available.

## Consequences
- **One-time manual setup required, not yet done**: create the
  `devafusion-dev-migrations` environment in Azure DevOps and add a
  manual approval check naming the approvers, before this pipeline's
  `ApplyMigration` stage can run for the first time.
- **`sc-devafusion-terraform`'s exact firewall-rule RBAC permission is
  inferred, not directly confirmed** - the custom Terraform deployment
  role's `Microsoft.DBforPostgreSQL/flexibleServers/*` wildcard
  (extended during the cost-circuit-breaker slice) should cover the
  child `firewallRules` action, consistent with this project's existing
  wildcard-per-resource-type convention, but this has not been proven
  by an actual run under that identity - watch the first real
  `ApplyMigration` run closely for an RBAC-denied error on the
  firewall-rule create/delete steps specifically.
- The identity/MFA schema from ADR-0012
  (`0000_better_auth_identity_and_mfa.sql`) is the first migration this
  pipeline will actually apply to the live server - not yet run as of
  this ADR.
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
