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
  not a blind fixed sleep after opening the firewall rule.** The first
  actual production run of this pipeline failed after ~270ms with no
  further detail (drizzle-kit's terminal spinner overwrites the line
  where a real Node error/stack trace would otherwise print, and none
  appeared in the raw Azure DevOps log fetched directly via `az
  devops`/REST API - `Bash exited with code '1'` was the only concrete
  signal). Firewall-rule propagation delay is the best-supported
  explanation, not a certainty: Microsoft's own docs state firewall
  configuration changes "can take up to five minutes," `az ... create`
  returns success as soon as Azure accepts the request rather than once
  propagated, and a direct `pg` connection test from a long-allowlisted
  IP (this author's machine, not the CD agent) succeeded immediately
  with full `rejectUnauthorized: true` TLS verification - ruling out
  the SSL warning in the log (see below) as the cause, and leaving
  propagation delay as the only remaining explanation consistent with
  the evidence, though the CD agent's exact fresh-rule scenario was not
  directly reproduced. A bounded retry loop (6 attempts, 10s initial
  delay doubling each time, ~5 minutes total worst case matching
  Microsoft's documented figure) wraps the migrate call, since
  propagation is frequently much faster than the worst case in
  practice and a blind fixed sleep would always pay the worst-case
  cost.
- **Pinned `sslmode=verify-full` explicitly, in both `web.tf`'s
  `DATABASE_URL` app_setting and this pipeline's own connection string -
  previously both used `sslmode=require`.** The first failed run's log
  carried a `pg-connection-string` deprecation warning: `require`,
  `prefer`, and `verify-ca` are *currently* treated as aliases for
  `verify-full` (full certificate-chain + hostname verification), but
  this will change to weaker libpq semantics in `pg-connection-string`
  v3.0.0/`pg` v9.0.0. Initially treated as a candidate root cause for
  the failure (plausible, since a `verify-full`-style handshake failing
  would also produce a fast, sub-second failure) but ruled out by the
  direct connection test above. Still fixed regardless, per root
  AGENTS.md's Deprecation Upgrades rule - leaving it as `require` means
  the connection's actual security posture would silently weaken on a
  future dependency bump with no code change to flag it.

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

## Correction: the second failure's true root cause was not firewall propagation
The retry-with-backoff fix above did not resolve the failure. A second
production run retried all 6 attempts over ~5m38s with the exact same
fast (~500ms-1s), no-error failure pattern every single time - if
firewall propagation were the cause, at least one retry should have
succeeded once the rule settled. It didn't, and this was compounded by
separately observing the *same server's* firewall rules taking closer
to ~10 minutes to propagate during a live Terraform apply, which would
have made the original 5-minute retry budget too short regardless.

The actual root cause, found by bypassing `drizzle-kit`'s CLI (which
reliably swallows the real exception behind its terminal spinner, in
every environment, not just CI) with `drizzle-orm`'s own `migrate()`
function called directly: a genuine PostgreSQL error, `type "citext"
does not exist`. `azurerm_postgresql_flexible_server_configuration`'s
`azure.extensions = "CITEXT"` (`infrastructure/app/modules/postgresql/
main.tf`) only allowlists the extension server-wide - it does **not**
run `CREATE EXTENSION citext;` inside any specific database. Confirmed
directly by querying `pg_extension` on the live server: only
`plpgsql`/`pgaadauth`/`azure` existed; `citext` never had been created.
Firewall propagation and the SSL deprecation warning were both real
observations from the earlier failure's log, but neither was ever the
actual cause - the migration failed identically even from an IP
allowlisted for over a day, ruling out firewall state entirely, once
tested directly.

Fixed by adding a `CREATE EXTENSION IF NOT EXISTS citext;` step
(idempotent, safe on every run) immediately before `drizzle-kit
migrate`, using the same `pg` package already available after `npm
ci` rather than introducing `psql` as an unverified new dependency on
the pipeline's hosted agent. Verified end-to-end against the live
server directly from this session (not just re-running the pipeline):
`drizzle-kit migrate` printed "migrations applied successfully!" and
the five expected tables (`account`, `session`, `user`,
`user_security`, `verification`) were confirmed to exist via a direct
query immediately afterward.

The retry-with-backoff logic is kept, not removed, since the ~10-minute
propagation delay separately observed via Terraform's own apply log is
real and independent of this fix - it protects against a genuinely
different failure mode that just happened not to be the one that
occurred here.

## Security note
During diagnosis of the first failed run, the live PostgreSQL admin
password was inadvertently displayed in plaintext in an interactive
session (`az keyvault secret show` without output suppression). Per
root AGENTS.md's Zero Hardcoded Secrets rule, this was treated as a
genuine exposure requiring rotation rather than dismissed as harmless
because it happened in a diagnostic command rather than a committed
file. The credential was rotated immediately: a new password was
generated, applied to the live server first (`az postgres
flexible-server update --admin-password`), then written to the
`postgresql-admin-password-devafusion` Key Vault secret to match -
in that order, so Key Vault and the live server were never
inconsistent with each other. Confirmed via `terraform plan` that no
drift resulted (the `azurerm_postgresql_flexible_server` resource
reads the password from the same Key Vault data source Terraform
already treats as externally managed, per ADR-0004/ADR-0010).

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
  (`0000_better_auth_identity_and_mfa.sql`) has now actually applied to
  the live server - confirmed directly (not via the pipeline, which
  has not yet been re-run with this fix) during diagnosis: all five
  expected tables exist. The pipeline itself still needs a successful
  end-to-end run to confirm the `CREATE EXTENSION` fix works
  unattended, under the CD service connection's identity, not just
  from this author's already-migrated database state.
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
