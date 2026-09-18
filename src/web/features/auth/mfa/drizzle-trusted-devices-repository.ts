import { and, eq, gt } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import { db as defaultDb } from "@/db/client";
import { trustedDevices } from "@/db/schema";
import type * as schema from "@/db/schema";

import type { TrustedDevicesRepository } from "./trusted-devices-repository";

type TrustedDevicesDb = PgDatabase<PgQueryResultHKT, typeof schema>;

export class DrizzleTrustedDevicesRepository
  implements TrustedDevicesRepository
{
  constructor(private readonly db: TrustedDevicesDb = defaultDb) {}

  async create(entry: {
    id: string;
    userId: string;
    deviceLabel: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.insert(trustedDevices).values(entry);
  }

  async findValidById(
    id: string,
    userId: string,
  ): Promise<{ id: string; expiresAt: Date } | undefined> {
    const [row] = await this.db
      .select({ id: trustedDevices.id, expiresAt: trustedDevices.expiresAt })
      .from(trustedDevices)
      .where(
        and(
          eq(trustedDevices.id, id),
          eq(trustedDevices.userId, userId),
          gt(trustedDevices.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return row;
  }

  async listByUserId(
    userId: string,
  ): Promise<{ id: string; deviceLabel: string; expiresAt: Date }[]> {
    return this.db
      .select({
        id: trustedDevices.id,
        deviceLabel: trustedDevices.deviceLabel,
        expiresAt: trustedDevices.expiresAt,
      })
      .from(trustedDevices)
      .where(eq(trustedDevices.userId, userId));
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db
      .delete(trustedDevices)
      .where(eq(trustedDevices.userId, userId));
  }
}
