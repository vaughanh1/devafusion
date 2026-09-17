import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { recordAuthAuditLog } from "@/features/auth/mfa/auth-audit-log";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { securitySettingsRequestSchema } from "@/features/auth/mfa/security-settings.zod";
import { consumeRateLimit } from "@/features/auth/rate-limit";

const userSecurityRepository = new DrizzleUserSecurityRepository();

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

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Security settings update failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
