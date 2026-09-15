# Drizzle ORM behind a repository pattern, PGlite/Docker for local dev, no Neon

Devafusion's first structured data workload (the engineering log, currently
static TypeScript files; OAuth/social-auth identity next) needs an ORM and
a migration workflow on top of the PostgreSQL Flexible Server already
provisioned (ADR-0010). The chosen stack is **Drizzle ORM** (schema +
queries) + **`drizzle-kit`** (migrations) + **`drizzle-zod`** (Zod schema
generation) + **`@asteasolutions/zod-to-openapi`** (spec-only OpenAPI
generation), with every consumer depending on a `LogEntryRepository`
interface rather than importing Drizzle directly.

## Status
Accepted

## Rationale
- **Repository pattern (SOLID's Dependency Inversion Principle)**: every
  page/component that reads the engineering log depends on the
  `LogEntryRepository` interface (`features/log/repository.ts`), never on
  Drizzle. `DrizzleLogEntryRepository` is the only file that imports
  `drizzle-orm` directly. Swapping ORMs later means writing one new class,
  not touching every call site.
- **Drizzle over Prisma**: plain TypeScript schema (`pgTable`), not a
  second DSL to keep in sync with application types by hand (DRY). Zero
  runtime dependency overhead and no Edge-runtime compatibility concerns
  to reason about (irrelevant here regardless, since this project runs
  Node.js standalone on Linux App Service, not Vercel Edge - ADR-0001).
  Prisma's own newest migration engine is self-described as "early" (no
  squash command, no shadow-database dry run); Drizzle's `generate`/
  `migrate` workflow is mature and stable.
- **`drizzle-zod`**: generates Zod select/insert schemas directly from the
  Drizzle table definition - one schema drives the DB table, runtime
  validation, and (via `zod-to-openapi`) the OpenAPI spec, so the three
  never drift out of sync by hand.
- **OpenAPI spec-only, no public UI yet**: `openapi-docs.json` is
  generated at build time as an internal/future reference. A public
  Swagger UI page is deliberately deferred until there is a real API
  route surface worth documenting - this slice proves the tooling against
  the engineering log's schema only.
- **PGlite for local dev, no Neon**: PGlite (a WASM Postgres build) gives
  an in-process, zero-install real Postgres for local development and
  Vitest (gated by the existing `TEST_DB_ACTIONS` flag). Neon was
  considered and explicitly rejected, even for throwaway schema testing -
  it would add a dependency on a second, unrelated third-party vendor's
  uptime/region/free-tier terms for zero benefit over PGlite/Docker, and
  production data must stay in the Azure-hosted instance ADR-0010 already
  committed to.
- **Schema-sharing strategy: backend-first (Drizzle-generated), not
  hand-authored-Zod-first, not a permanently separate client schema**:
  three approaches were on the table for the relationship between the DB
  schema and any future form's validation schema. (1) *Two independent
  schemas* - a hand-written client-side Zod schema for the form, a
  separately hand-written/Drizzle-derived backend schema for constraints
  like DB nullability/uniqueness - zero client bundle risk but duplicated
  by hand and drifts. (2) *Backend-first* - `createInsertSchema`/
  `createSelectSchema` (`drizzle-zod`) derive the Zod schema directly
  from the Drizzle table, so nullability, defaults, and enum unions are
  correct by construction; the tradeoff is that the schema module now
  transitively depends on `drizzle-orm`, which must never reach a client
  bundle. (3) *Schema-first* - a raw, hand-authored Zod schema as the one
  source of truth, with the DB table treated as a secondary consumer -
  inverts DRY the other way, since the DB's own constraints (defaults,
  arrays, enums) then have to be kept in sync with the Zod schema by
  hand instead of the reverse. **Option 2 (backend-first) is what this
  slice implements** (`features/log/schema/log-entries.zod.ts`): one
  Drizzle table definition is the single source of truth, and Zod
  validation, OpenAPI docs, and (later) form validation all derive from
  it, consistent with the DRY rationale already given for `drizzle-zod`
  above. A future registration/feedback/contact form (with reCAPTCHA and
  MFA, per product intent already stated) is exactly the case Option 2
  is betting on: that form's client-side schema should still derive from
  the same Drizzle table its server-side handler validates against,
  rather than living as a hand-maintained duplicate. The risk this
  creates - a client component naively importing a `drizzle-zod`-derived
  schema and pulling `drizzle-orm`/`pg` into the browser bundle - is
  closed with an explicit `import "server-only"` guard at the top of both
  `db/schema.ts` and `log-entries.zod.ts`, so that mistake fails the
  build loudly instead of silently shipping. Option 1's two-schema split
  is not ruled out permanently - if a future form needs client-only
  validation rules with no DB equivalent (password-confirmation
  matching, a "the reCAPTCHA token is present" check, an "I agree to
  the ToS" checkbox), those rules belong in a hand-written schema that
  composes with (`.and()`/`.extend()`), not replaces, the Drizzle-derived
  one - re-evaluate this the moment that first form is actually built,
  not before.
- **No CD pipeline migration step in this slice**: this slice proves the
  tooling/schema/repository pattern only. The engineering log's real
  data migration into the live Azure PostgreSQL instance, and the
  corresponding `drizzle-kit migrate` CD pipeline step, are deliberately
  scoped to a following slice - isolating the "first use of a new CD
  pipeline step" risk from the tooling proof, consistent with how the
  cost-circuit-breaker's first-use gaps (provider registration, RBAC,
  webhook expiry ceiling) each surfaced only once a real Azure round-trip
  happened.

## Considered Options
- **Prisma** - rejected: second schema DSL, less mature migration engine
  by its own admission, no meaningful benefit over Drizzle for this
  project's Node-standalone hosting model.
- **Kysely** - rejected: a pure SQL query builder with no schema
  definition DSL and no migration generator of its own; would lose the
  free Zod-schema generation this project specifically wants.
- **Atlas** (paired with `drizzle-kit export`) - rejected for now: a more
  powerful, dedicated schema-migration engine, but a second tool/binary
  to install and trust that isn't justified at this project's current
  single-database, single-environment scale.
- **node-pg-migrate / Knex migrations** - rejected: hand-written SQL and
  hand-written TypeScript types kept in sync manually - a DRY violation.
- **Neon (even for local/CI-only use)** - rejected: unnecessary third-party
  dependency; Docker/PGlite already cover the need at zero cost and zero
  external risk.

## Consequences
- `DrizzleLogEntryRepository` and any future repository implementation
  take their `db` client as a constructor parameter (dependency
  injection) rather than importing a single module-level instance
  directly - this is what makes them testable against an in-memory PGlite
  client without a real network connection or `DATABASE_URL` being set.
- Any code that both creates a Drizzle/Zod schema and calls `.openapi()`
  on it must import the schema module in a way that resolves
  `zod-openapi-setup.ts`'s `extendZodWithOpenApi` side effect first - ES
  module `import` hoisting means this cannot be done by ordering
  statements within a single file; it requires a dedicated side-effect
  module imported by the schema file itself.
- Added the `server-only` package (one new, deliberate dependency) and
  imported it at the top of both `db/schema.ts` and
  `features/log/schema/log-entries.zod.ts` - any future attempt to
  import either module from a client component now fails the build
  immediately with a clear error, instead of silently bundling
  `drizzle-orm`/`pg` into client JavaScript.
- The engineering log's actual data migration from static files into
  PostgreSQL, and the CD pipeline's `drizzle-kit migrate` step, are not
  yet built - tracked as a follow-up slice, not forgotten scope.
- `next` was upgraded to 16.3.5 as part of this slice's dependency
  installation, fixing two critical, unrelated pre-existing CVEs
  (unauthenticated RCE on Windows-hosted servers and in the Image
  Optimization API) discovered via `npm audit` - a deliberate, logged
  Deprecation Upgrade (root AGENTS.md), not scope creep.
- A moderate-severity `esbuild` advisory remains, transitively required
  by `drizzle-kit`'s own dependency tree (`@esbuild-kit/esm-loader`).
  This is dev-tooling-only exposure (the vulnerable dev server only runs
  when a developer manually invokes a `drizzle-kit` command locally) with
  no fix available except a major-version downgrade of `drizzle-kit`
  itself, which would be a worse regression - accepted as a documented,
  known risk rather than routed around.

## Related
- ADR-0010 (PostgreSQL Flexible Server selection)
- ADR-0004 (Key Vault secret provisioning boundary - `DATABASE_URL`
  sourcing)
- `infrastructure/AGENTS.md` §PostgreSQL (schema-migration-file rule)
