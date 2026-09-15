import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { logEntries } from "@/db/schema";
import type * as schema from "@/db/schema";

import type { LogEntryRepository } from "./repository";
import type { LogEntry } from "./types";

// The only file in this feature that imports Drizzle directly - the
// adapter half of the repository pattern (see repository.ts for the
// port). If Drizzle is ever swapped for another ORM/query builder, this
// is the only file that needs rewriting.
//
// The db client is a constructor parameter (dependency injection),
// defaulting to the shared app-wide client, rather than a hard import of
// a single module-level instance - this is what actually lets a test
// substitute an in-memory PGlite client without needing DATABASE_URL to
// be set or a real network connection opened at import time. PgDatabase
// is the driver-agnostic base type both node-postgres and PGlite satisfy.
type LogEntriesDb = PgDatabase<PgQueryResultHKT, typeof schema>;

function toLogEntry(row: typeof logEntries.$inferSelect): LogEntry {
  return {
    slug: row.slug,
    date: row.date,
    title: row.title,
    summary: row.summary,
    tags: row.tags,
    decisions: row.decisions,
    milestones: row.milestones,
    validation: row.validation,
    commit: row.commit ?? undefined,
    pullRequest: row.pullRequest ?? undefined,
    visibility: row.visibility,
  };
}

export class DrizzleLogEntryRepository implements LogEntryRepository {
  constructor(private readonly db: LogEntriesDb = defaultDb) {}

  async findAll(): Promise<LogEntry[]> {
    const rows = await this.db.select().from(logEntries);
    return rows.map(toLogEntry);
  }

  async findBySlug(slug: string): Promise<LogEntry | undefined> {
    const [row] = await this.db
      .select()
      .from(logEntries)
      .where(eq(logEntries.slug, slug))
      .limit(1);

    return row ? toLogEntry(row) : undefined;
  }
}
