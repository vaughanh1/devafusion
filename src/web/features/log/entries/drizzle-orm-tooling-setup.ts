import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "drizzle-orm-tooling-setup",
  date: "2026-09-15",
  title: "Database tooling: Drizzle ORM behind a repository pattern",
  summary:
    "Set up Drizzle ORM, drizzle-kit migrations, drizzle-zod validation, and spec-only OpenAPI generation, all proven against a local in-memory PGlite Postgres rather than a real network database. No production data was touched - the engineering log stays on static files for now; this slice proves the tooling and the SOLID repository pattern that will carry it, and any future OAuth/contact-form data, into PostgreSQL.",
  tags: ["architecture", "database", "typescript", "security"],
  decisions: [
    "Put a LogEntryRepository interface between every consumer and Drizzle - DrizzleLogEntryRepository is the only file that imports drizzle-orm directly, so a future ORM swap only means writing a new class, not touching every call site (SOLID's Dependency Inversion Principle).",
    "Chose Drizzle over Prisma: a plain TypeScript schema rather than a second DSL to keep in sync by hand (DRY), no Edge-runtime compatibility baggage to reason about (irrelevant anyway on this project's Node-standalone Linux App Service hosting), and a mature, stable generate/migrate workflow versus Prisma's own newest migration engine, which Prisma itself describes as still early.",
    "Made the repository's db client a constructor parameter defaulting to the shared app client, instead of a hard module-level import - this is what actually lets a Vitest suite substitute an in-memory PGlite client with no real network connection or DATABASE_URL needed.",
    "Rejected Neon for local/CI Postgres, even for throwaway schema testing - it would add a dependency on a second, unrelated third-party vendor for zero benefit over PGlite/Docker, and production data must stay in the Azure-hosted instance ADR-0010 already committed to. PGlite (an in-process WASM Postgres) covers local dev and Vitest; a real Docker postgres:16 container was considered for CI but not added this slice since nothing yet needs production-parity behaviour a WASM build can't already provide - reconsidering that call is explicitly this project's cue against YAGNI, not a permanent decision.",
    "Discovered ES module import hoisting breaks the naive 'call extendZodWithOpenApi before creating schemas in the same file' pattern - imports resolve before any top-level statement runs, regardless of source order, so the patch had to move into its own dedicated side-effect module imported by the schema file itself.",
    "Ran npm audit as part of installing new dependencies and found two critical, pre-existing CVEs in next@16.3.2 (unauthenticated RCE on Windows-hosted servers, and in the Image Optimization API) that predated this session entirely - upgraded to next@16.3.5 as a deliberate, logged Deprecation Upgrade rather than leaving a known-vulnerable version in place because it was inconvenient mid-slice.",
    "Accepted one remaining moderate-severity esbuild advisory, transitively required by drizzle-kit's own dependency tree - it's dev-tooling-only exposure (the vulnerable dev server only runs when a developer manually invokes a drizzle-kit command locally) with no fix available except a major-version downgrade of drizzle-kit itself, which would be a worse regression than the risk it fixes.",
    "Chose the backend-first schema-sharing strategy (drizzle-zod's createInsertSchema/createSelectSchema deriving Zod from the Drizzle table) over a hand-authored-Zod-first or permanently-separate-client-schema split - the DB table stays the single source of truth for nullability/defaults/enum constraints, which is exactly what a future registration/feedback form (with reCAPTCHA and MFA already on the roadmap) needs from its client-side validation schema. Added the server-only package and imported it at the top of db/schema.ts and log-entries.zod.ts so an accidental client-side import of either module fails the build immediately instead of silently bundling drizzle-orm/pg into browser JavaScript.",
  ],
  milestones: [
    "Installed drizzle-orm, pg, zod, drizzle-zod (dependencies) and drizzle-kit, @electric-sql/pglite, @types/pg, tsx (devDependencies), plus @asteasolutions/zod-to-openapi.",
    "Added db/schema.ts (the log_entries Drizzle table), db/client.ts (the pooled node-postgres client), and drizzle.config.ts.",
    "Added features/log/repository.ts (the LogEntryRepository interface) and features/log/drizzle-log-entry-repository.ts (the Drizzle adapter).",
    "Added features/log/schema/log-entries.zod.ts (drizzle-zod generated select/insert schemas) and features/log/schema/zod-openapi-setup.ts (the extendZodWithOpenApi side-effect module).",
    "Added scripts/generate-openapi.ts, wired to a new npm run db:openapi script, producing a spec-only openapi-docs.json build artifact (gitignored).",
    "Added features/log/__tests__/drizzle-log-entry-repository.test.ts, gated by TEST_DB_ACTIONS, running all assertions against a real in-memory PGlite Postgres.",
    "Upgraded next to 16.3.5 (and eslint-config-next to match) to close two critical CVEs found via npm audit; ran npm audit fix for an unrelated js-yaml advisory.",
    "Added docs/adr/0011-drizzle-orm-and-repository-pattern.md.",
    "Installed server-only and added it as an explicit import to db/schema.ts and features/log/schema/log-entries.zod.ts.",
    "Added a Database, Schema Sharing & Future Forms section to src/web/AGENTS.md codifying the server-only guard rule and the Server-Action/backend-first-validation pattern for the next real form.",
    "Updated infrastructure/AGENTS.md's PostgreSQL section, which had gone stale (still said no instance existed) - now describes the live instance, the drizzle-kit generate/migrate workflow as the only sanctioned schema-change path, and the deliberately deferred CD migration step.",
  ],
  validation: [
    "npm run typecheck and npm run lint both passed clean",
    "npm run build succeeded with every route still static/SSG - the new db/repository code is not yet imported by any page, and Pool's lazy connection behaviour confirmed it doesn't throw at module load with DATABASE_URL unset",
    "npm run test:unit passed all 15 existing tests plus the 3 new PGlite-backed repository tests when TEST_DB_ACTIONS=true, and confirmed all 3 are correctly skipped when the flag is unset",
    "npm run db:openapi generated a correct openapi-docs.json distinguishing LogEntry (select, all fields required) from LogEntryInsert (only the fields with no default/nullable constraint required)",
    "npm audit reported 0 vulnerabilities after the next upgrade and js-yaml fix, with one remaining moderate esbuild advisory explicitly accepted and documented rather than silently ignored",
  ],
  visibility: "public",
};
