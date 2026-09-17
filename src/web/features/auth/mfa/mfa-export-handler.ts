import { DrizzleBackupCodesRepository } from "@/features/auth/mfa/drizzle-backup-codes-repository";
import { DrizzleTrustedDevicesRepository } from "@/features/auth/mfa/drizzle-trusted-devices-repository";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";

const userSecurityRepository = new DrizzleUserSecurityRepository();
const backupCodesRepository = new DrizzleBackupCodesRepository();
const trustedDevicesRepository = new DrizzleTrustedDevicesRepository();

export type MfaExportPayload = {
  requiredFactors: string[];
  mfaFrequency: "always" | "30_days";
  twoFactorEnabled: boolean;
  unusedBackupCodeCount: number;
  trustedDevices: { deviceLabel: string; expiresAt: string }[];
};

// UK GDPR Article 15 (right of access) - extends the existing SAR
// export (app/api/account/export/route.ts) with the MFA matrix's own
// configuration metadata. Strictly forbidden from exporting: the
// plaintext or encrypted two_factor_secret value, any backup code's
// hash, or the opaque trusted-device lookup token itself - none of
// these have any legitimate use to the user reading their own export
// (the secret/hash values are meaningless outside this application's
// own verification code, and exporting the trusted-device token
// would hand out a live, reusable bypass credential). Only the
// metadata a user would actually want to review (which factors are
// required, how often, whether TOTP is on, how many backup codes
// remain, and a human-readable device label/expiry per trusted
// device) is ever included.
export async function buildMfaExportPayload(
  userId: string,
): Promise<MfaExportPayload> {
  const security = await userSecurityRepository.findByUserId(userId);
  const unusedBackupCodeCount =
    await backupCodesRepository.countUnusedByUserId(userId);
  const trustedDevices = await trustedDevicesRepository.listByUserId(userId);

  return {
    requiredFactors: security?.requiredFactors ?? ["password", "totp"],
    mfaFrequency: security?.mfaFrequency ?? "always",
    twoFactorEnabled: security?.twoFactorEnabled ?? false,
    unusedBackupCodeCount,
    trustedDevices: trustedDevices.map((device) => ({
      deviceLabel: device.deviceLabel,
      expiresAt: device.expiresAt.toISOString(),
    })),
  };
}
