import type { LogEntry } from "./types";

// Port (SOLID's Dependency Inversion Principle): every consumer of the
// engineering log depends on this interface, never on Drizzle or any
// other persistence detail directly. Swapping the backing ORM/store later
// means writing a new class implementing this interface - nothing that
// imports LogEntryRepository changes at all.
//
// Kept deliberately narrow (YAGNI) - only the operations the site
// actually performs today (list everything, look up one by slug). Do not
// add speculative methods (pagination, filtering, write operations) until
// a real caller needs them.
export interface LogEntryRepository {
  findAll(): Promise<LogEntry[]>;
  findBySlug(slug: string): Promise<LogEntry | undefined>;
}
