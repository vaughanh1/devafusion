import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { DrizzleTrustedDevicesRepository } from "../drizzle-trusted-devices-repository";

describe("DrizzleTrustedDevicesRepository", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repository: DrizzleTrustedDevicesRepository;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    repository = new DrizzleTrustedDevicesRepository(db);

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
      CREATE TABLE "trusted_devices" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "user_security"("user_id") ON DELETE CASCADE,
        "device_label" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    await client.exec(`INSERT INTO "user_security" ("user_id") VALUES ('u1'), ('u2');`);
  });

  afterEach(async () => {
    await client.exec('DELETE FROM "trusted_devices";');
  });

  afterAll(async () => {
    await client.close();
  });

  function futureDate(daysFromNow: number): Date {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  }

  it("creates a device and finds it as valid by id and userId", async () => {
    await repository.create({
      id: "device-1",
      userId: "u1",
      deviceLabel: "Chrome on Windows",
      expiresAt: futureDate(30),
    });

    const found = await repository.findValidById("device-1", "u1");
    expect(found?.id).toBe("device-1");
  });

  it("returns undefined for a valid device id belonging to a different user", async () => {
    await repository.create({
      id: "device-1",
      userId: "u1",
      deviceLabel: "Chrome on Windows",
      expiresAt: futureDate(30),
    });

    expect(await repository.findValidById("device-1", "u2")).toBeUndefined();
  });

  it("returns undefined for an expired device", async () => {
    await repository.create({
      id: "device-1",
      userId: "u1",
      deviceLabel: "Chrome on Windows",
      expiresAt: futureDate(-1),
    });

    expect(await repository.findValidById("device-1", "u1")).toBeUndefined();
  });

  it("returns undefined for a device id that was never created", () => {
    return expect(repository.findValidById("never-created", "u1")).resolves.toBeUndefined();
  });

  it("lists every device for a user with its label and expiry", async () => {
    await repository.create({
      id: "device-1",
      userId: "u1",
      deviceLabel: "Chrome on Windows",
      expiresAt: futureDate(30),
    });
    await repository.create({
      id: "device-2",
      userId: "u1",
      deviceLabel: "Safari on iPhone",
      expiresAt: futureDate(30),
    });

    const devices = await repository.listByUserId("u1");
    expect(devices).toHaveLength(2);
    expect(devices.map((d) => d.deviceLabel).sort()).toEqual([
      "Chrome on Windows",
      "Safari on iPhone",
    ]);
  });

  it("deleteAllByUserId removes every device for that user only", async () => {
    await repository.create({
      id: "device-1",
      userId: "u1",
      deviceLabel: "Chrome on Windows",
      expiresAt: futureDate(30),
    });
    await repository.create({
      id: "device-2",
      userId: "u2",
      deviceLabel: "Safari on iPhone",
      expiresAt: futureDate(30),
    });

    await repository.deleteAllByUserId("u1");

    expect(await repository.listByUserId("u1")).toHaveLength(0);
    expect(await repository.listByUserId("u2")).toHaveLength(1);
  });
});
