// Port (SOLID's Dependency Inversion Principle) - mirrors
// user-security-repository.ts's exact pattern. Never accepts or
// returns any client hardware/fingerprint signal (UK PECR) - id is
// always a server-generated opaque lookup token.
export interface TrustedDevicesRepository {
  create(entry: {
    id: string;
    userId: string;
    deviceLabel: string;
    expiresAt: Date;
  }): Promise<void>;

  findValidById(
    id: string,
    userId: string,
  ): Promise<{ id: string; expiresAt: Date } | undefined>;

  listByUserId(
    userId: string,
  ): Promise<{ id: string; deviceLabel: string; expiresAt: Date }[]>;

  deleteAllByUserId(userId: string): Promise<void>;
}
