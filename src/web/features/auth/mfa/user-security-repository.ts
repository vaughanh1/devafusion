// Port (SOLID's Dependency Inversion Principle): every consumer depends
// on this interface, never on Drizzle directly - mirrors
// features/log/repository.ts exactly. two_factor_secret is the
// encryptedSecretText customType (db/schema.ts) - Drizzle's own
// toDriver/fromDriver hooks transparently encrypt/decrypt at the
// column boundary, so every value passing through this interface is
// always plaintext; this interface has no opinion on encryption at
// all, only persistence.
export interface UserSecurityRepository {
  findByUserId(userId: string): Promise<{
    userId: string;
    requiredFactors: string[];
    mfaFrequency: "always" | "30_days";
    twoFactorSecret: string | null;
    twoFactorEnabled: boolean;
  } | undefined>;

  upsertTwoFactorSecret(userId: string, plaintextSecret: string): Promise<void>;

  // Sets two_factor_secret back to NULL directly (not an empty-
  // string encrypt/decrypt round-trip) - used when TOTP is
  // deactivated, per this project's "zero-out on deactivation"
  // requirement (UK GDPR data minimisation - no stale encrypted
  // secret should ever persist once the factor is no longer
  // required).
  clearTwoFactorSecret(userId: string): Promise<void>;

  setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void>;

  setRequiredFactors(userId: string, requiredFactors: string[]): Promise<void>;

  setMfaFrequency(
    userId: string,
    mfaFrequency: "always" | "30_days",
  ): Promise<void>;
}

