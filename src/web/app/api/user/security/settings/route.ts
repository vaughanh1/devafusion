import { randomBytes } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordAuthAuditLog } from "@/features/auth/mfa/auth-audit-log";
import { DrizzleTrustedDevicesRepository } from "@/features/auth/mfa/drizzle-trusted-devices-repository";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { securitySettingsRequestSchema } from "@/features/auth/mfa/security-settings.zod";
import { consumeRateLimit } from "@/features/auth/rate-limit";
import {
  TRUSTED_DEVICE_COOKIE_NAME,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from "@/features/auth/mfa/trusted-device-cookie";

const userSecurityRepository = new DrizzleUserSecurityRepository();
const trustedDevicesRepository = new DrizzleTrustedDevicesRepository();

// ADR-0014: outside Better Auth's own router - a looser window/max
// than the credential-brute-force-target TOTP/verify routes, since
// this is an authenticated user changing their own settings rather
// than a raw credential guess target, but still bounded.
const SECURITY_SETTINGS_RATE_LIMIT = { windowMs: 60_000, max: 10 };

// Weaker-than-default policies that require the client-side risk
// acknowledgement checkbox (MfaSettingsDashboard) - re-enforced here
// since client-side state is never authoritative. "Weaker" is
// defined as: no factor beyond password, i.e. requiredFactors is
// exactly ["password"].
function isWeakerThanDefault(requiredFactors: string[]): boolean {
  return requiredFactors.length === 1 && requiredFactors[0] === "password";
}

// UK GDPR Article 25 - ANY change to this table requires the current
// password to be re-confirmed (mirrors DeleteAccountForm's existing
// pattern for account deletion), verified via Better Auth's own
// server-scope /verify-password endpoint rather than re-implementing
// password hashing/comparison here.
export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const rateLimitResult = await consumeRateLimit(
      request,
      "/api/user/security/settings",
      SECURITY_SETTINGS_RATE_LIMIT,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "X-Retry-After": rateLimitResult.retryAfterSeconds.toString() },
        },
      );
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = securitySettingsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { password, requiredFactors, mfaFrequency, riskAcknowledged } =
      parsed.data;

    if (isWeakerThanDefault(requiredFactors) && !riskAcknowledged) {
      return NextResponse.json(
        { error: "Risk acknowledgement is required for this configuration." },
        { status: 400 },
      );
    }

    // Real, reported account lockout closed by this check: nothing
    // previously stopped a user from selecting "Authenticator App
    // (TOTP)" and saving it as a required factor WITHOUT ever
    // actually confirming it (no secret ever generated/scanned, no
    // /api/auth/two-factor/confirm call ever succeeded). login-
    // step1.ts then required 'totp' at every future login with no
    // working secret behind it - an unrecoverable lockout with no
    // error shown at save time to explain why. This is TOTP-specific
    // (not applied to 'email', which needs no prior enrolment - a
    // fresh code is sent live on every challenge) and only blocks
    // NEWLY requiring 'totp' - an account that already has it
    // confirmed can always keep saving other settings, since
    // twoFactorEnabled would already be true for that case.
    if (requiredFactors.includes("totp")) {
      const existing = await userSecurityRepository.findByUserId(
        session.user.id,
      );
      if (!existing?.twoFactorEnabled) {
        return NextResponse.json(
          {
            error:
              "Finish setting up your authenticator app (scan the code and confirm it below) before selecting it as your second factor.",
          },
          { status: 400 },
        );
      }
    }

    try {
      await auth.api.verifyPassword({
        body: { password },
        headers: requestHeaders,
      });
    } catch {
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 },
      );
    }

    await userSecurityRepository.setRequiredFactors(
      session.user.id,
      requiredFactors,
    );
    await userSecurityRepository.setMfaFrequency(session.user.id, mfaFrequency);

    // Deactivating TOTP zeroes out the secret column entirely -
    // never leaves a stale encrypted secret behind once the factor
    // is no longer required, per this slice's own "zero-out on
    // deactivation" requirement.
    if (!requiredFactors.includes("totp")) {
      await userSecurityRepository.setTwoFactorEnabled(session.user.id, false);
      await userSecurityRepository.clearTwoFactorSecret(session.user.id);
    }

    await recordAuthAuditLog({
      userId: session.user.id,
      action: "security_settings_updated",
      performedBy: session.user.id,
    });

    const response = NextResponse.json({ updated: true });

    // Selecting "30 days" here is the user's explicit statement that
    // this device should be trusted for that period - without this,
    // trusted_devices stayed empty until the next full MFA challenge
    // at login, so saving this setting had no visible effect until
    // then. Immediately trusting the current device (the one that
    // just re-confirmed the account password above) matches what a
    // user selecting this option actually expects to happen.
    if (mfaFrequency === "30_days") {
      const trustedDeviceId = randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000,
      );

      await trustedDevicesRepository.create({
        id: trustedDeviceId,
        userId: session.user.id,
        deviceLabel:
          requestHeaders.get("user-agent")?.slice(0, 255) ?? "Unknown device",
        expiresAt,
      });

      response.cookies.set(TRUSTED_DEVICE_COOKIE_NAME, trustedDeviceId, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
      });
    }

    return response;
  } catch (error) {
    console.error("Security settings update failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
