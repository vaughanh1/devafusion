import { randomBytes } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { DrizzleUserSecurityRepository } from "../drizzle-user-security-repository";

// Real PGlite in-memory Postgres, including the real
// encryptedSecretText customType path (db/schema.ts) - this proves
// the repository's plaintext-in/plaintext-out contract actually
// holds through a real encrypt/decrypt round trip via Drizzle's own
// toDriver/fromDriver hooks, not just against a mocked column.
describe("DrizzleUserSecurityRepository", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: DrizzleUserSecurityRepository;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    repository = new DrizzleUserSecurityRepository(db);

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
    `);
  });

  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(async () => {
    await client.exec('DELETE FROM "user_security";');
  });

  afterAll(async () => {
    await client.close();
  });

  it("returns undefined for a user with no row yet", async () => {
    expect(await repository.findByUserId("never-created")).toBeUndefined();
  });

  it("upserts a plaintext secret and reads it back decrypted, not as ciphertext", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");

    const record = await repository.findByUserId("u1");
    expect(record?.twoFactorSecret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("stores the secret encrypted at rest (not equal to the raw column value)", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");

    const [rawRow] = await client.query<{ two_factor_secret: string }>(
      `SELECT two_factor_secret FROM user_security WHERE user_id = 'u1';`,
    ).then((result) => result.rows);

    expect(rawRow?.two_factor_secret).not.toBe("JBSWY3DPEHPK3PXP");
    expect(rawRow?.two_factor_secret).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it("clearTwoFactorSecret sets the column back to null", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");
    await repository.clearTwoFactorSecret("u1");

    const record = await repository.findByUserId("u1");
    expect(record?.twoFactorSecret).toBeNull();
  });

  it("setTwoFactorEnabled flips the flag for an existing row", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");
    await repository.setTwoFactorEnabled("u1", true);

    expect((await repository.findByUserId("u1"))?.twoFactorEnabled).toBe(true);
  });

  it("setRequiredFactors updates the array for an existing row", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");
    await repository.setRequiredFactors("u1", ["password", "email"]);

    expect((await repository.findByUserId("u1"))?.requiredFactors).toEqual([
      "password",
      "email",
    ]);
  });

  it("setMfaFrequency updates the enum for an existing row", async () => {
    await repository.upsertTwoFactorSecret("u1", "JBSWY3DPEHPK3PXP");
    await repository.setMfaFrequency("u1", "30_days");

    expect((await repository.findByUserId("u1"))?.mfaFrequency).toBe("30_days");
  });

  it("setTwoFactorEnabled on a user with no prior row creates one with defaults", async () => {
    await repository.setTwoFactorEnabled("u2", true);

    const record = await repository.findByUserId("u2");
    expect(record?.twoFactorEnabled).toBe(true);
    expect(record?.requiredFactors).toEqual(["password", "totp"]);
    expect(record?.mfaFrequency).toBe("always");
  });
});
