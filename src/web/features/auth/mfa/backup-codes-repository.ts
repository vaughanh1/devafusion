// Port (SOLID's Dependency Inversion Principle) - mirrors
// user-security-repository.ts's exact pattern. Every value here is
// already a hash (features/auth/mfa/backup-code-hash.ts) - this
// interface never sees or returns a plaintext backup code.
export interface BackupCodesRepository {
  insertMany(userId: string, hashedCodes: string[]): Promise<void>;

  findUnusedByUserId(
    userId: string,
  ): Promise<{ id: string; hashedCode: string }[]>;

  markUsed(id: string): Promise<void>;

  countUnusedByUserId(userId: string): Promise<number>;

  deleteAllByUserId(userId: string): Promise<void>;
}
