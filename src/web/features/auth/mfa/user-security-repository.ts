// Port (SOLID's Dependency Inversion Principle): every consumer depends
// on this interface, never on Drizzle directly - mirrors
// features/log/repository.ts exactly. Values passed in/out are always
// the encrypted-at-rest string (see two-factor-secret-cipher.ts) - this
// interface has no opinion on encryption, only persistence.
export interface UserSecurityRepository {
  findByUserId(userId: string): Promise<{
    userId: string;
    twoFactorSecret: string | null;
    twoFactorEnabled: boolean;
  } | undefined>;

  upsertTwoFactorSecret(
    userId: string,
    encryptedSecret: string,
  ): Promise<void>;

  setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void>;
}
