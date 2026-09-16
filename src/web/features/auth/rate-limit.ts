import "server-only";

import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { rateLimit } from "@/db/schema";
import type * as schema from "@/db/schema";
import { resolveClientIp } from "@/features/auth/client-ip";

// Constructor-injectable db, mirroring
// features/auth/mfa/drizzle-user-security-repository.ts's exact
// pattern - lets the unit test suite exercise this against a real
// PGlite in-memory Postgres instead of either mocking drizzle-orm's
// query builder (fragile, low-value) or requiring a live network
// database for a unit test.
type RateLimitDb = PgDatabase<PgQueryResultHKT, typeof schema>;

// ADR-0014: self-built rate limiter for routes outside Better Auth's own
// router (/api/auth/two-factor/verify, /api/account/export,
// /api/account/delete) - Better Auth's own rateLimit plugin only
// throttles requests that go through its own dispatch pipeline
// (auth.api.*), per its own documented "server-side requests made using
// auth.api aren't affected by rate limiting" caveat, and every one of
// these routes calls auth.api.getSession directly rather than being
// dispatched through Better Auth's router. Deliberately reuses the same
// "rate_limit" table Better Auth's own rateLimit plugin uses (docs/adr/
// 0014) rather than a second table, since both are pruned by the same
// scheduled Automation runbook and both use the identical key shape
// (`${clientIp}|${path}`, matching @better-auth/core/utils/ip's own
// createRateLimitKey format) - a second table would only fragment that
// pruning job.
type RateLimitRule = {
  windowMs: number;
  max: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// A single UPDATE ... RETURNING is the atomic primitive: it reads the
// current row and decides the new count in one round trip, so two
// concurrent requests for the same key cannot both read a stale count
// and both be allowed through - the second request's UPDATE simply
// affects zero rows once the first has already incremented past max
// within the window, and vice versa for a fresh window.
export async function consumeRateLimit(
  request: Request,
  path: string,
  rule: RateLimitRule,
  db: RateLimitDb = defaultDb,
): Promise<RateLimitResult> {
  const clientIp = resolveClientIp(request);
  const key = `${clientIp}|${path}`;
  const now = Date.now();
  const windowStart = now - rule.windowMs;

  const [updated] = await db
    .update(rateLimit)
    .set({
      count: sql`${rateLimit.count} + 1`,
      lastRequest: now,
    })
    .where(
      sql`${rateLimit.key} = ${key} AND ${rateLimit.lastRequest} > ${windowStart} AND ${rateLimit.count} < ${rule.max}`,
    )
    .returning({ count: rateLimit.count });

  if (updated) return { allowed: true };

  // No row matched the "still within limit" predicate above - either
  // there is no row yet (first request for this key) or the existing
  // row's window has expired, both of which reset to count = 1 via the
  // same upsert; or the row is within its window but already at max,
  // in which case the conflict branch's WHERE guard below refuses to
  // touch it and this insert's onConflictDoNothing leaves the existing
  // (over-limit) row untouched.
  const insertResult = await db
    .insert(rateLimit)
    .values({
      id: crypto.randomUUID(),
      key,
      count: 1,
      lastRequest: now,
    })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: { count: 1, lastRequest: now },
      setWhere: sql`${rateLimit.lastRequest} <= ${windowStart}`,
    })
    .returning({ count: rateLimit.count, lastRequest: rateLimit.lastRequest });

  const row = insertResult[0];
  if (row && row.count === 1 && row.lastRequest === now) return { allowed: true };

  const retryAfterSeconds = row
    ? Math.max(1, Math.ceil((row.lastRequest + rule.windowMs - now) / 1000))
    : Math.ceil(rule.windowMs / 1000);

  return { allowed: false, retryAfterSeconds };
}
