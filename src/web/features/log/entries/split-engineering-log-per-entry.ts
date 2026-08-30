import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "split-engineering-log-per-entry",
  date: "2026-08-30",
  title: "Split the engineering log into one file per entry",
  summary:
    "engineering-log.ts held every entry in a single shared array, so two branches in flight at once - this one and the concurrently-merged Vitest/Playwright PR - both appended to the same array tail and produced a merge conflict. Split it into one file per entry under features/log/entries/, so future concurrent branches each add a new file instead of colliding on the same seam.",
  tags: ["process", "typescript", "devops"],
  decisions: [
    "Give every entry its own file (features/log/entries/<slug>.ts exporting a single LogEntry) rather than trying to reduce how often entries land near each other in time - the actual defect was a shared, append-only array as the collision surface, not the frequency of edits.",
    "Keep engineering-log.ts as a thin barrel that imports every entry file and re-exports engineeringLog/getLogEntry with an unchanged public shape, so app/log/page.tsx and app/log/[slug]/page.tsx needed zero changes.",
    "Sort entries by date in the barrel rather than relying on import order, since entry files can now be added in any order without needing to know their chronological position relative to every other file.",
    "Migrate the existing 12 entries with a throwaway TypeScript-AST script (deleted immediately after use) instead of hand-copying ~360 lines of string literals, to eliminate transcription risk across dense prose fields like decisions and validation.",
    "Add a rebase-before-every-push rule to root AGENTS.md's Git & Environment Isolation section, since the root cause of the original conflict was a long-lived branch going stale mid-flight, not just the array's shape - the file split prevents this specific collision, the rebase habit surfaces the next one before it reaches GitHub.",
  ],
  milestones: [
    "Added features/log/types.ts, extracting the LogEntry type out of engineering-log.ts so entry files don't import from the barrel they're aggregated into.",
    "Added 12 features/log/entries/<slug>.ts files, one per pre-existing log entry, each exporting a single LogEntry named entry.",
    "Rewrote engineering-log.ts as an import/aggregate/sort barrel, preserving the exact engineeringLog and getLogEntry exports the two /log route files already depend on.",
    "Updated root AGENTS.md's Log-Driven Development rule to describe the per-file convention, and added a new Re-Sync Before Every Push rule.",
  ],
  validation: [
    "npm run lint (eslint --max-warnings 0) passed clean, confirming every new entries/*.ts filename satisfies the existing check-file kebab-case rule.",
    "npm run typecheck passed clean.",
    "npm run build succeeded; the build's route summary confirmed all 13 /log/[slug] SSG paths (12 pre-existing plus this entry) still generated correctly.",
    "npm run test:unit passed all existing unit suites unchanged, confirming the barrel's public shape is unaffected.",
    "Manually diffed each generated entries/*.ts file's content against the original array elements to confirm the AST-based migration script transcribed every field verbatim.",
  ],
  visibility: "public",
};
