import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { authAuditLogs } from "@/db/schema";
import type * as schema from "@/db/schema";

type AuthAuditLogDb = PgDatabase<PgQueryResultHKT, typeof schema>;

// UK GDPR Article 32 accountability trail - a single append-only
// write helper rather than a full repository, since nothing in this
// slice ever reads auth_audit_logs back (no admin UI exists yet).
// Deliberately never throws past the caller: recording an audit
// entry must never itself block or fail the security-relevant action
// it is describing (e.g. account deletion must still complete even
// if the audit write somehow fails) - callers wrap this in their own
// try/catch per src/web/AGENTS.md's explicit error handling rule and
// log a console.error on failure rather than letting it propagate.
export async function recordAuthAuditLog(
  entry: { userId: string; action: string; performedBy: string },
  db: AuthAuditLogDb = defaultDb,
): Promise<void> {
  await db.insert(authAuditLogs).values(entry);
}
