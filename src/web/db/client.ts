import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// A single pooled connection, opened once at module load and reused for
// the lifetime of the process - correct for this project's hosting model
// (Linux App Service, standalone Node, always-warm process; see
// docs/adr/0010-relational-database-engine-selection.md) since there is
// no per-request cold start to reason about, unlike a serverless/Edge
// deployment. Never instantiate a second Pool/db client elsewhere.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool, schema });
