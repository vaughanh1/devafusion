import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// A single pooled connection, opened once at module load and reused for
// the lifetime of the process - correct for this project's hosting model
// (Linux App Service, standalone Node, always-warm process; see
// docs/adr/0010-relational-database-engine-selection.md) since there is
// no per-request cold start to reason about, unlike a serverless/Edge
// deployment. Never instantiate a second Pool/db client elsewhere.
//
// ADR-0014: explicit pool bounds rather than pg's unbounded defaults -
// this single App Service instance must never itself exhaust the
// Postgres Burstable B1ms tier's own connection ceiling, especially now
// that Better Auth's database-backed rate limiter and the self-built
// limiter (features/auth/rate-limit.ts) both add extra query volume on
// every auth request. PgBouncer (Azure's built-in :6432, or a
// self-hosted sidecar/ACI instance) was considered and deliberately
// deferred rather than adopted - see docs/adr/0014's Consequences
// section for why (Azure's managed PgBouncer requires a paid General
// Purpose/Memory Optimized SKU upgrade; a self-hosted ACI instance
// costs real money and either opens a new public attack surface or
// needs new VNet plumbing; a free App Service sidecar requires
// containerizing this app first, which it is not today). max is set
// well below B1ms's documented connection ceiling to leave headroom for
// the CD pipeline's own temporary migration connection.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle({ client: pool, schema });
