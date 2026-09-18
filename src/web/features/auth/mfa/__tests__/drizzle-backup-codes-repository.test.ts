import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { DrizzleBackupCodesRepository } from "../drizzle-backup-codes-repository";

// Real PGlite in-memory Postgres, not a mocked query builder - same
// "prove it against something real" posture as
// features/auth/__tests__/rate-limit.test.ts. user_security's own FK
// to the citext "user" table is deliberately omitted here (this
// suite never needs a real user row, and citext is not relevant to
// backup_codes' own behaviour) - only the two tables backup_codes
// actually depends on are created.
describe("DrizzleBackupCodesRepository", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: DrizzleBackupCodesRepository;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    repository = new DrizzleBackupCodesRepository(db);

    await client.exec(`
      CREATE TYPE "mfa_frequency" AS ENUM('always', '30_days');
      CREATE TABLE "user_security" (
        "user_id" text PRIMARY KEY NOT NULL,
        "required_factors" text[] DEFAULT ARRAY['password', 'totp']::text[] NOT NULL,
        "mfa_frequency" "mfa_frequency" DEFAULT 'always' NOT NULL,
        "two_factor_secret" text,
        "two_factor_enabled" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE TABLE "backup_codes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL REFERENCES "user_security"("user_id") ON DELETE CASCADE,
        "hashed_code" text NOT NULL,
        "used_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await client.exec(`INSERT INTO "user_security" ("user_id") VALUES ('u1'), ('u2');`);
  });

  afterEach(async () => {
    await client.exec('DELETE FROM "backup_codes";');
  });

  afterAll(async () => {
    await client.close();
  });

  it("inserts many hashed codes and finds them as unused", async () => {
    await repository.insertMany("u1", ["hash1", "hash2", "hash3"]);

    const unused = await repository.findUnusedByUserId("u1");
    expect(unused).toHaveLength(3);
    expect(unused.map((row) => row.hashedCode).sort()).toEqual([
      "hash1",
      "hash2",
      "hash3",
    ]);
  });

  it("is a no-op when inserting an empty array", async () => {
    await expect(repository.insertMany("u1", [])).resolves.toBeUndefined();
    expect(await repository.findUnusedByUserId("u1")).toHaveLength(0);
  });

  it("excludes a code from findUnusedByUserId once markUsed is called", async () => {
    await repository.insertMany("u1", ["hash1", "hash2"]);
    const [first] = await repository.findUnusedByUserId("u1");

    await repository.markUsed(first!.id);

    const remaining = await repository.findUnusedByUserId("u1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.hashedCode).toBe(
      first!.hashedCode === "hash1" ? "hash2" : "hash1",
    );
  });

  it("countUnusedByUserId reflects only unused codes", async () => {
    await repository.insertMany("u1", ["hash1", "hash2", "hash3"]);
    const [first] = await repository.findUnusedByUserId("u1");
    await repository.markUsed(first!.id);

    expect(await repository.countUnusedByUserId("u1")).toBe(2);
  });

  it("keeps different users' codes independent", async () => {
    await repository.insertMany("u1", ["hash1"]);
    await repository.insertMany("u2", ["hash2"]);

    expect(await repository.countUnusedByUserId("u1")).toBe(1);
    expect(await repository.countUnusedByUserId("u2")).toBe(1);
  });

  it("deleteAllByUserId removes every code for that user only", async () => {
    await repository.insertMany("u1", ["hash1", "hash2"]);
    await repository.insertMany("u2", ["hash3"]);

    await repository.deleteAllByUserId("u1");

    expect(await repository.countUnusedByUserId("u1")).toBe(0);
    expect(await repository.countUnusedByUserId("u2")).toBe(1);
  });
});
