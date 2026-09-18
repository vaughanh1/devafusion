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
          requiredFactors: row.requiredFactors,
          mfaFrequency: row.mfaFrequency,
          twoFactorSecret: row.twoFactorSecret,
          twoFactorEnabled: row.twoFactorEnabled,
        }
      : undefined;
  }

  async upsertTwoFactorSecret(
    userId: string,
    plaintextSecret: string,
  ): Promise<void> {
    await this.db
      .insert(userSecurity)
      .values({ userId, twoFactorSecret: plaintextSecret })
      .onConflictDoUpdate({
        target: userSecurity.userId,
        set: { twoFactorSecret: plaintextSecret, updatedAt: new Date() },
      });
  }

  async clearTwoFactorSecret(userId: string): Promise<void> {
    await this.db
      .update(userSecurity)
      .set({ twoFactorSecret: null, updatedAt: new Date() })
      .where(eq(userSecurity.userId, userId));
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

  async setRequiredFactors(
    userId: string,
    requiredFactors: string[],
  ): Promise<void> {
    await this.db
      .insert(userSecurity)
      .values({ userId, requiredFactors })
      .onConflictDoUpdate({
        target: userSecurity.userId,
        set: { requiredFactors, updatedAt: new Date() },
      });
  }

  async setMfaFrequency(
    userId: string,
    mfaFrequency: "always" | "30_days",
  ): Promise<void> {
    await this.db
      .insert(userSecurity)
      .values({ userId, mfaFrequency })
      .onConflictDoUpdate({
        target: userSecurity.userId,
        set: { mfaFrequency, updatedAt: new Date() },
      });
  }
}

