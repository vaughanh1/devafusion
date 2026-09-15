// No "server-only" guard here deliberately: drizzle-kit's CLI (generate/
// migrate) requires this file directly via plain Node, outside Next.js's
// bundler, so it never resolves the "react-server" export condition and
// would hit server-only's hard throw unconditionally (found by actually
// running `drizzle-kit generate` - it failed outright). The real leak
// risk this guards against - a client component importing a
// drizzle-zod-derived schema - is already covered at that narrower entry
// point instead: see the "server-only" import in
// features/log/schema/log-entries.zod.ts, which fires before this file
// is ever reached in that import chain.
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Column shape mirrors src/web/features/log/types.ts's LogEntry exactly -
// this table is the eventual replacement for the static entries/*.ts
// files, not a new, separate concept. decisions/milestones/validation
// stay text[] (Postgres native array) rather than a normalized child
// table, since they are always read/written as a whole ordered list and
// never queried or filtered by individual item - a join table here would
// be exactly the kind of speculative normalization YAGNI warns against.
export const logEntries = pgTable("log_entries", {
  slug: text("slug").primaryKey(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  tags: text("tags").array().notNull(),
  decisions: text("decisions").array().notNull(),
  milestones: text("milestones").array().notNull(),
  validation: text("validation").array().notNull(),
  commit: text("commit"),
  pullRequest: text("pull_request"),
  visibility: text("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("public"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
