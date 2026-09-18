import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "auto-local-postgres-on-dev",
  date: "2026-09-18",
  title: "npm run dev now starts and migrates local Postgres automatically",
  summary:
    "Getting a working local dev environment required three manual steps before npm run dev would even boot without every page 500ing: start a Docker Postgres container, enable citext, and run npm run db:migrate. Added a predev script that does all three automatically, idempotently, every time npm run dev is run.",
  tags: ["dx", "typescript"],
  decisions: [
    "Used npm's own predev lifecycle hook rather than a separate documented manual step or a wrapper dev script - predev already runs automatically before dev with no extra configuration, and doesn't change what npm run dev itself does.",
    "Wrote a small dependency-free .env.local parser instead of adding the dotenv package - drizzle-kit migrate doesn't load .env.local on its own (confirmed directly: it fails with 'url: undefined' without this), and the script only needs ~15 lines to read DATABASE_URL for the child process it spawns.",
    "Made the script fully idempotent across three real states - container missing, stopped, or already running - confirmed by running it from each state in turn, not just reasoning about it.",
    "Left the existing clean-slate migration-testing workflow in AGENTS.md untouched as a separate, deliberate check for a genuinely empty database before pushing a new migration file - the persistent dev container this script manages is a different, longer-lived database that shouldn't be treated as proof a migration is safe.",
  ],
  milestones: [
    "src/web/scripts/ensure-local-postgres.mjs: starts/reuses devafusion-dev-local, enables citext, runs db:migrate.",
    "src/web/package.json: added a predev script wiring the above into npm run dev.",
    "Updated .env.example and AGENTS.md to describe the automated flow, keeping the manual steps as a fallback/troubleshooting reference.",
  ],
  validation: [
    "Ran the script directly from a cold start (no container), from a stopped container, and from an already-running container - all three completed cleanly and left the database migrated.",
    "Ran npm run dev for real and confirmed predev fired automatically, the container came up, migrations applied, and Next.js reported Ready.",
  ],
  visibility: "public",
};
