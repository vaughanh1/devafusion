import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "local-postgres-migration-testing",
  date: "2026-09-15",
  title: "Local Docker Postgres workflow for testing drizzle-kit migrations",
  summary:
    "Documented and proved, end-to-end against a real container, the local workflow for testing a drizzle-kit migration before it ever runs unattended in CD - and fixed a real drizzle-kit/server-only incompatibility found while doing it. No table was migrated to the live Azure Postgres server - that decision (and the identity/auth model it depends on) stays deliberately open.",
  tags: ["database", "testing", "typescript"],
  decisions: [
    "Removed the server-only guard from db/schema.ts - drizzle-kit's CLI (generate/migrate) requires this file directly via plain Node, outside Next.js's bundler, so it never resolves the 'react-server' export condition and hit server-only's hard throw unconditionally the moment drizzle-kit generate was actually run. The real leak risk server-only exists to prevent - a client component importing a drizzle-zod-derived schema - is already covered at the narrower entry point that matters: features/log/schema/log-entries.zod.ts's own server-only import, which fires before db/schema.ts is ever reached in that chain.",
    "Chose Docker Postgres over a standalone PGlite script for local migration testing - PGlite (used inside Vitest) is a WASM reimplementation, not the literal engine a migration will run against in production; Docker Postgres pinned to the same major version (16, matching infrastructure/app/modules/postgresql/variables.tf's postgres_version) proves the exact SQL/engine behaviour that will actually run live.",
    "Verified drizzle-kit generate itself requires no live database connection at all (confirmed against Drizzle's own docs before relying on it) - it diffs the schema file against previous snapshot.json files, so a schema-drift check could run on a bare CI agent with no DB access, though that check is not yet wired into CI as part of this change.",
  ],
  milestones: [
    "Added a 'Local Postgres for Migration Testing' section to src/web/AGENTS.md with the exact docker run command (pinned to postgres:16), the DATABASE_URL-and-db:migrate workflow, and a psql inspection step.",
    "Actually ran the full workflow for real: docker run postgres:16, npm run db:migrate against it, confirmed the resulting log_entries table matches db/schema.ts exactly via psql \\d, confirmed drizzle-kit auto-creates and populates a drizzle.__drizzle_migrations bookkeeping table (queried it directly to see the real migration hash/timestamp row - this is Drizzle's own answer to 'what migration version is the live database at'), confirmed re-running db:migrate a second time is a safe idempotent no-op, then stopped and discarded the container.",
    "Left src/web/drizzle/0000_init_log_entries.sql (the generated migration for the existing log_entries table) deliberately uncommitted and untracked - migrating it to the live Azure server is intentionally deferred until the identity/auth model that will actually consume a visibility-filtered log_entries table is decided, per this session's discussion.",
  ],
  validation: [
    "npm run typecheck and npm run lint both passed clean after removing the server-only guard from db/schema.ts",
    "npm run db:migrate succeeded against a real, freshly started postgres:16 Docker container with no prior state",
    "psql \\d log_entries confirmed every column, type, nullability, and default matched db/schema.ts's Drizzle table definition exactly",
    "SELECT * FROM drizzle.__drizzle_migrations confirmed exactly one row (the init migration's hash and timestamp) after the first run",
    "Re-running npm run db:migrate a second time against the same container completed instantly with no error and applied zero additional migrations, confirming idempotency",
  ],
  visibility: "public",
};
