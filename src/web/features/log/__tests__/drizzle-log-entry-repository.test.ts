import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { DrizzleLogEntryRepository } from "../drizzle-log-entry-repository";

// Gated by TEST_DB_ACTIONS (src/web/__tests__/AGENTS.md) - runs against a
// real, in-process WASM Postgres (PGlite), not a mock, so this proves the
// actual SQL the repository generates rather than a stubbed interface.
// Skipped entirely when the flag is unset/false, matching this repo's
// documented default-to-cheapest-when-unset convention.
const runDbTests = process.env.TEST_DB_ACTIONS === "true";

describe.skipIf(!runDbTests)("DrizzleLogEntryRepository", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: DrizzleLogEntryRepository;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle({ client, schema });

    // Mirrors db/schema.ts exactly - kept as a literal DDL statement here
    // rather than running drizzle-kit push against PGlite mid-test, so
    // this suite has no dependency on a config file or CLI subprocess.
    await db.execute(`
      CREATE TABLE log_entries (
        slug TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        tags TEXT[] NOT NULL,
        decisions TEXT[] NOT NULL,
        milestones TEXT[] NOT NULL,
        validation TEXT[] NOT NULL,
        commit TEXT,
        pull_request TEXT,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Constructor injection (see drizzle-log-entry-repository.ts) is what
    // makes this possible - the repository never has to open a real
    // network connection or read DATABASE_URL to be tested.
    repository = new DrizzleLogEntryRepository(db);
  });

  beforeEach(async () => {
    await db.execute(`TRUNCATE TABLE log_entries;`);
  });

  afterAll(async () => {
    await client.close();
  });

  it("returns an empty array when no entries exist", async () => {
    const entries = await repository.findAll();
    expect(entries).toEqual([]);
  });

  it("round-trips a full entry through insert and findBySlug", async () => {
    await db.insert(schema.logEntries).values({
      slug: "test-entry",
      date: "2026-01-01",
      title: "Test entry",
      summary: "A summary.",
      tags: ["test"],
      decisions: ["Decided something."],
      milestones: ["Shipped something."],
      validation: ["Verified something."],
      visibility: "public",
    });

    const found = await repository.findBySlug("test-entry");

    expect(found).toMatchObject({
      slug: "test-entry",
      title: "Test entry",
      tags: ["test"],
    });
  });

  it("returns undefined for a slug that does not exist", async () => {
    const found = await repository.findBySlug("does-not-exist");
    expect(found).toBeUndefined();
  });
});
