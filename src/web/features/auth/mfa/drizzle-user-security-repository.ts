import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { userSecurity } from "@/db/schema";
import type * as schema from "@/db/schema";

import type { UserSecurityRepository } from "./user-security-repository";

// The only file in this feature that imports Drizzle directly - mirrors
// features/log/drizzle-log-entry-repository.ts's adapter pattern
// exactly, including constructor-injected db for PGlite testability.
type UserSecurityDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export class DrizzleUserSecurityRepository implements UserSecurityRepository {
  constructor(private readonly db: UserSecurityDb = defaultDb) {}

  async findByUserId(userId: string) {
    const [row] = await this.db
      .select()
      .from(userSecurity)
      .where(eq(userSecurity.userId, userId))
      .limit(1);

    return row
      ? {
          userId: row.userId,
          twoFactorSecret: row.twoFactorSecret,
          twoFactorEnabled: row.twoFactorEnabled,
        }
      : undefined;
  }

  async upsertTwoFactorSecret(
    userId: string,
    encryptedSecret: string,
  ): Promise<void> {
    await this.db
      .insert(userSecurity)
      .values({ userId, twoFactorSecret: encryptedSecret })
      .onConflictDoUpdate({
        target: userSecurity.userId,
        set: { twoFactorSecret: encryptedSecret, updatedAt: new Date() },
      });
  }

  async setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.db
      .insert(userSecurity)
      .values({ userId, twoFactorEnabled: enabled })
      .onConflictDoUpdate({
        target: userSecurity.userId,
        set: { twoFactorEnabled: enabled, updatedAt: new Date() },
      });
  }
}
