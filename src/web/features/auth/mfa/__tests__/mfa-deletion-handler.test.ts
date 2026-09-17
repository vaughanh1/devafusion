import { randomBytes } from "node:crypto";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { deleteMfaDataForUser } from "../mfa-deletion-handler";

// Real PGlite in-memory Postgres (same pattern as
// drizzle-user-security-repository.test.ts) - proves the actual
// transactional cascade (user_security, backup_codes, trusted_devices
// deleted; auth_audit_logs written and survives) against a real
// Drizzle transaction, not a mocked one. user_security's own FK to
// Better Auth's user table is deliberately not created here (same
// simplification the repository test above already established) -
// only the MFA-matrix tables under test need to exist.
describe("deleteMfaDataForUser", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });

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
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "user_security"("user_id") ON DELETE CASCADE,
        "hashed_code" text NOT NULL,
        "used_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE TABLE "trusted_devices" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "user_security"("user_id") ON DELETE CASCADE,
        "device_label" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE TABLE "auth_audit_logs" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "performed_by" text NOT NULL,
        "timestamp" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
  });

  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(async () => {
    await client.exec(`
      DELETE FROM "backup_codes";
      DELETE FROM "trusted_devices";
      DELETE FROM "user_security";
      DELETE FROM "auth_audit_logs";
    `);
  });

  afterAll(async () => {
    await client.close();
  });

  async function seedUser(userId: string) {
    await db.insert(schema.userSecurity).values({ userId, twoFactorEnabled: true });
    await db.insert(schema.backupCodes).values({ userId, hashedCode: "hash1" });
    await db.insert(schema.trustedDevices).values({
      id: `device-${userId}`,
      userId,
      deviceLabel: "Chrome on Windows",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  it("deletes user_security, backup_codes, and trusted_devices for the user", async () => {
    await seedUser("u1");

    await deleteMfaDataForUser("u1", "u1", db);

    expect(
      (await db.select().from(schema.userSecurity)).filter((row) => row.userId === "u1"),
    ).toHaveLength(0);
    expect(
      (await db.select().from(schema.backupCodes)).filter((row) => row.userId === "u1"),
    ).toHaveLength(0);
    expect(
      (await db.select().from(schema.trustedDevices)).filter((row) => row.userId === "u1"),
    ).toHaveLength(0);
  });

  it("writes an mfa_data_deleted audit log entry that survives the deletion", async () => {
    await seedUser("u1");

    await deleteMfaDataForUser("u1", "u1", db);

    const logs = await db.select().from(schema.authAuditLogs);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: "u1",
      action: "mfa_data_deleted",
      performedBy: "u1",
    });
  });

  it("records a different performedBy from userId for a future admin-initiated deletion", async () => {
    await seedUser("u1");

    await deleteMfaDataForUser("u1", "admin-42", db);

    const [log] = await db.select().from(schema.authAuditLogs);
    expect(log).toMatchObject({ userId: "u1", performedBy: "admin-42" });
  });

  it("does not affect another user's rows", async () => {
    await seedUser("u1");
    await seedUser("u2");

    await deleteMfaDataForUser("u1", "u1", db);

    expect(
      (await db.select().from(schema.userSecurity)).filter((row) => row.userId === "u2"),
    ).toHaveLength(1);
    expect(
      (await db.select().from(schema.backupCodes)).filter((row) => row.userId === "u2"),
    ).toHaveLength(1);
  });

  it("is a no-op (other than the audit log write) for a user with no existing rows", async () => {
    await expect(
      deleteMfaDataForUser("never-existed", "never-existed", db),
    ).resolves.toBeUndefined();

    const logs = await db.select().from(schema.authAuditLogs);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ userId: "never-existed" });
  });
});
