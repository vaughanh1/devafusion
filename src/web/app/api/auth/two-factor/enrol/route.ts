import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { auth } from "@/auth";
import {
  generateBackupCodes,
  hashBackupCode,
} from "@/features/auth/mfa/backup-code-hash";
import { DrizzleBackupCodesRepository } from "@/features/auth/mfa/drizzle-backup-codes-repository";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { renderTotpQrCodeDataUri } from "@/features/auth/mfa/totp-qr-code";

const userSecurityRepository = new DrizzleUserSecurityRepository();
const backupCodesRepository = new DrizzleBackupCodesRepository();

// otpauth's own TOTP issuer/label - "DevAFusion" matches this
// project's actual brand name (components/brand/brand-mark.tsx),
// shown by every authenticator app next to the generated 6-digit
// code, so a user with multiple accounts across apps can identify
// which entry belongs to this site.
const TOTP_ISSUER = "DevAFusion";

// Self-built TOTP enrolment (docs/adr/0012, docs/adr's MFA-matrix
// slice) - deliberately not Better Auth's own twoFactor plugin's
// enable endpoint, for the same plaintext-secret-storage reason
// already documented throughout features/auth/mfa/.
export async function POST() {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const existing = await userSecurityRepository.findByUserId(userId);
    if (existing?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled for this account." },
        { status: 409 },
      );
    }

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      label: session.user.email,
      secret,
    });
    const otpauthUri = totp.toString();

    // Accessibility/deliverability requirement, not cosmetic: a raw
    // otpauth:// URI string cannot be scanned by anything, and most
    // email clients that strip inline images would also strip a
    // <img src="otpauth://..."> tag even if one were attempted -
    // this is a real PNG, safe wherever a normal <img> is safe.
    // secret.base32 is also returned as plain text alongside it so a
    // user relying on a screen reader, a text-only client, or
    // someone who simply cannot scan a QR code can still type the
    // secret manually into their authenticator app.
    const qrCodeDataUri = await renderTotpQrCodeDataUri(otpauthUri);

    // encryptedSecretText (db/schema.ts) transparently encrypts this
    // plaintext base32 secret at the column boundary - the
    // repository call below never sees or produces ciphertext
    // itself.
    await userSecurityRepository.upsertTwoFactorSecret(userId, secret.base32);

    const requiredFactors = existing?.requiredFactors ?? [];
    if (!requiredFactors.includes("totp")) {
      await userSecurityRepository.setRequiredFactors(userId, [
        ...requiredFactors,
        "totp",
      ]);
    }

    // twoFactorEnabled deliberately stays false here - the dedicated
    // app/api/auth/two-factor/confirm/route.ts is what actually
    // flips it, proving the user's authenticator app produces a
    // matching code for the freshly scanned QR before the account
    // depends on it. See MfaSettingsDashboard's wiring, which calls
    // /api/auth/two-factor/confirm immediately after this response
    // before treating enrolment as complete.

    // UK GDPR Article 32 (availability) - 8 fresh recovery codes,
    // returned once in plaintext so the user can save them; only
    // their hashes are ever persisted (backup-code-hash.ts).
    // Regenerating (calling this route again before enabling) issues
    // a brand-new set rather than appending, since the prior set was
    // never confirmed as saved.
    await backupCodesRepository.deleteAllByUserId(userId);
    const backupCodes = generateBackupCodes();
    await backupCodesRepository.insertMany(
      userId,
      backupCodes.map(hashBackupCode),
    );

    return NextResponse.json({
      qrCodeDataUri,
      manualEntrySecret: secret.base32,
      backupCodes,
    });
  } catch (error) {
    console.error("TOTP enrolment failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
