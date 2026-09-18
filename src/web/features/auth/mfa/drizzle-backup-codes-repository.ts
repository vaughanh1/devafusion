import { and, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { backupCodes } from "@/db/schema";
import type * as schema from "@/db/schema";

import type { BackupCodesRepository } from "./backup-codes-repository";

// The only file in this feature that imports Drizzle directly for
// backup codes - mirrors drizzle-user-security-repository.ts exactly,
// including constructor-injected db for PGlite testability.
type BackupCodesDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export class DrizzleBackupCodesRepository implements BackupCodesRepository {
  constructor(private readonly db: BackupCodesDb = defaultDb) {}

  async insertMany(userId: string, hashedCodes: string[]): Promise<void> {
    if (hashedCodes.length === 0) return;

    await this.db
      .insert(backupCodes)
      .values(hashedCodes.map((hashedCode) => ({ userId, hashedCode })));
  }

  async findUnusedByUserId(
    userId: string,
  ): Promise<{ id: string; hashedCode: string }[]> {
    const rows = await this.db
      .select({ id: backupCodes.id, hashedCode: backupCodes.hashedCode })
      .from(backupCodes)
      .where(and(eq(backupCodes.userId, userId), isNull(backupCodes.usedAt)));

    return rows;
  }

  async markUsed(id: string): Promise<void> {
    await this.db
      .update(backupCodes)
      .set({ usedAt: new Date() })
      .where(eq(backupCodes.id, id));
  }

  async countUnusedByUserId(userId: string): Promise<number> {
    const rows = await this.findUnusedByUserId(userId);
    return rows.length;
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db.delete(backupCodes).where(eq(backupCodes.userId, userId));
  }
}
