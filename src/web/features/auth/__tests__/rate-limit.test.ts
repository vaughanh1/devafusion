import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";

import { consumeRateLimit } from "../rate-limit";

// Real PGlite in-memory Postgres, not a mocked query builder - proves
// the actual atomic UPDATE/INSERT SQL this module depends on against a
// real Postgres dialect, mirroring the "prove it against something
// real" posture drizzle-orm-tooling-setup.ts's log entry established
// for the PGlite repository suite.
function buildRequest() {
  return new Request("https://devafusion.net/api/account/export", {
    headers: { "x-forwarded-for": "203.0.113.9" },
  });
}

describe("consumeRateLimit", () => {
  let client: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    client = new PGlite();
    db = drizzle(client, { schema });
    await client.exec(`
      CREATE TABLE "rate_limit" (
        "id" text PRIMARY KEY NOT NULL,
        "key" text NOT NULL,
        "count" integer NOT NULL,
        "last_request" bigint NOT NULL,
        CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
      );
    `);
  });

  afterEach(async () => {
    await client.exec('DELETE FROM "rate_limit";');
  });

  afterAll(async () => {
    await client.close();
  });

  it("allows the first request for a fresh key", async () => {
    const result = await consumeRateLimit(
      buildRequest(),
      "/api/account/export",
      { windowMs: 60_000, max: 3 },
      db,
    );

    expect(result).toEqual({ allowed: true });
  });

  it("allows requests up to max within the window, then denies", async () => {
    const rule = { windowMs: 60_000, max: 3 };
    const path = "/api/account/export";

    const first = await consumeRateLimit(buildRequest(), path, rule, db);
    const second = await consumeRateLimit(buildRequest(), path, rule, db);
    const third = await consumeRateLimit(buildRequest(), path, rule, db);
    const fourth = await consumeRateLimit(buildRequest(), path, rule, db);

    expect(first).toEqual({ allowed: true });
    expect(second).toEqual({ allowed: true });
    expect(third).toEqual({ allowed: true });
    expect(fourth.allowed).toBe(false);
    if (!fourth.allowed) {
      expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks separate keys independently for different client IPs", async () => {
    const rule = { windowMs: 60_000, max: 1 };
    const path = "/api/account/export";

    const requestA = new Request("https://devafusion.net" + path, {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    const requestB = new Request("https://devafusion.net" + path, {
      headers: { "x-forwarded-for": "203.0.113.2" },
    });

    const firstA = await consumeRateLimit(requestA, path, rule, db);
    const firstB = await consumeRateLimit(requestB, path, rule, db);
    const secondA = await consumeRateLimit(requestA, path, rule, db);

    expect(firstA).toEqual({ allowed: true });
    expect(firstB).toEqual({ allowed: true });
    expect(secondA.allowed).toBe(false);
  });

  it("tracks separate keys independently for different paths", async () => {
    const rule = { windowMs: 60_000, max: 1 };
    const request = buildRequest();

    const first = await consumeRateLimit(request, "/api/account/export", rule, db);
    const second = await consumeRateLimit(
      request,
      "/api/auth/two-factor/verify",
      rule,
      db,
    );

    expect(first).toEqual({ allowed: true });
    expect(second).toEqual({ allowed: true });
  });
});
