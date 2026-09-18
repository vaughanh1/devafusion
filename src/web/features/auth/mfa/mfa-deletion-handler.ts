import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import {
  authAuditLogs,
  backupCodes,
  trustedDevices,
  userSecurity,
} from "@/db/schema";
import type * as schema from "@/db/schema";

type DeletionDb = PgDatabase<PgQueryResultHKT, typeof schema>;

// UK GDPR Article 17 (right to erasure) cascade for the MFA matrix
// tables, run as one transaction so a partial failure never leaves
// backup_codes or trusted_devices orphaned relative to user_security
// - this is this feature's own explicit cascade rather than relying
// solely on the database-level ON DELETE CASCADE foreign keys
// (db/schema.ts), since the audit log write below must happen
// alongside the deletion, not as an afterthought, and Article 32
// requires that trail to exist even though the rows it describes are
// about to be removed. auth_audit_logs itself is deliberately never
// deleted here - see db/schema.ts's own comment on why that table has
// no cascading foreign key back to the user it describes.
export async function deleteMfaDataForUser(
  userId: string,
  performedBy: string,
  db: DeletionDb = defaultDb,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(trustedDevices).where(eq(trustedDevices.userId, userId));
    await tx.delete(backupCodes).where(eq(backupCodes.userId, userId));
    await tx.delete(userSecurity).where(eq(userSecurity.userId, userId));
    await tx.insert(authAuditLogs).values({
      userId,
      action: "mfa_data_deleted",
      performedBy,
    });
  });
}
