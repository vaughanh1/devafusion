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
import { enrolTotpRequestSchema } from "@/features/auth/mfa/enrol-totp.zod";
import { renderTotpQrCodeDataUri } from "@/features/auth/mfa/totp-qr-code";

const userSecurityRepository = new DrizzleUserSecurityRepository();
const backupCodesRepository = new DrizzleBackupCodesRepository();

// otpauth's own TOTP issuer/label - "Devafusion" matches this
// project's actual brand name (components/brand/brand-mark.tsx),
// shown by every authenticator app next to the generated 6-digit
// code, so a user with multiple accounts across apps can identify
// which entry belongs to this site. Note: an already-enrolled
// account's authenticator app keeps whatever issuer string was baked
// into its QR code at enrolment time - this only takes effect for
// new/re-enrolments.
const TOTP_ISSUER = "Devafusion";

// Self-built TOTP enrolment (docs/adr/0012, docs/adr's MFA-matrix
// slice) - deliberately not Better Auth's own twoFactor plugin's
// enable endpoint, for the same plaintext-secret-storage reason
// already documented throughout features/auth/mfa/.
export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Body is optional - a first-time enrolment (the common case) has
    // no existing factor to prove ownership of and sends none; the
    // schema treats a missing/empty body as {} rather than a parse
    // error.
    const rawBody = await request.text();
    const parsed = enrolTotpRequestSchema.safeParse(
      rawBody ? JSON.parse(rawBody) : {},
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const existing = await userSecurityRepository.findByUserId(userId);

    // A RE-enrolment (recovering from a lost/reset authenticator
    // device) is only allowed once the account's current password is
    // re-confirmed - mirroring the same re-authorization requirement
    // /api/user/security/settings already enforces for any change to
    // this table. Without this gate, anyone with a live session
    // (e.g. from a stolen cookie) could silently replace the TOTP
    // secret and lock the real owner's authenticator app out.
    if (existing?.twoFactorEnabled) {
      if (!parsed.data.password) {
        return NextResponse.json(
          {
            error:
              "Your current password is required to reset an existing authenticator app.",
          },
          { status: 400 },
        );
      }

      try {
        await auth.api.verifyPassword({
          body: { password: parsed.data.password },
          headers: requestHeaders,
        });
      } catch {
        return NextResponse.json(
          { error: "Incorrect password." },
          { status: 401 },
        );
      }

      // Flip back to false for the duration of the re-enrolment
      // window - the freshly generated secret below has not yet been
      // proven to work with the user's authenticator app. Leaving
      // the prior secret marked enabled while replacing it would
      // create a real lockout: if the user abandons this flow before
      // calling /api/auth/two-factor/confirm, the account would be
      // stuck depending on a secret no working app has ever scanned.
      // /api/auth/two-factor/confirm is still what flips this back to
      // true, exactly as it does for a first-time enrolment.
      await userSecurityRepository.setTwoFactorEnabled(userId, false);
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
      // Raw otpauth:// URI, alongside the rendered QR - offered as a
      // tappable link for the case a QR code cannot actually solve:
      // a user whose only camera-equipped device IS the phone they
      // are enrolling on has nothing else to scan the code with.
      // otpauth:// itself is confirmed as the real, standard scheme
      // (Google Authenticator's own published Key Uri Format spec) -
      // whether a given installed authenticator app registers as its
      // OS-level handler was not independently verified per-app here
      // (varies by app/OS and is outside what this server can check),
      // so the frontend must degrade gracefully (a plain link, not an
      // auto-triggered redirect) if tapping it does nothing on a
      // particular device.
      otpauthUri,
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
