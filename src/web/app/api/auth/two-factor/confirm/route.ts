import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { auth } from "@/auth";
import { confirmTotpRequestSchema } from "@/features/auth/mfa/confirm-totp.zod";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { consumeRateLimit } from "@/features/auth/rate-limit";

const userSecurityRepository = new DrizzleUserSecurityRepository();

// ADR-0014: outside Better Auth's own router (identical rationale to
// two-factor/verify's own comment) - a tight window/max matching the
// sensitivity of a brute-forceable 6-digit TOTP code.
const CONFIRM_TOTP_RATE_LIMIT = { windowMs: 10_000, max: 5 };

// Authenticated confirmation step for enrol/route.ts - proves the
// user's authenticator app actually produces a matching code for
// the secret just issued before flipping two_factor_enabled to true,
// so an account never depends on an MFA factor that was never
// verified as actually working.
export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const rateLimitResult = await consumeRateLimit(
      request,
      "/api/auth/two-factor/confirm",
      CONFIRM_TOTP_RATE_LIMIT,
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

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = confirmTotpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const security = await userSecurityRepository.findByUserId(session.user.id);
    if (!security?.twoFactorSecret) {
      return NextResponse.json(
        { error: "No pending TOTP enrolment found for this account." },
        { status: 409 },
      );
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(security.twoFactorSecret),
    });
    const delta = totp.validate({ token: parsed.data.code, window: 1 });

    if (delta === null) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 401 },
      );
    }

    await userSecurityRepository.setTwoFactorEnabled(session.user.id, true);

    return NextResponse.json({ enabled: true });
  } catch (error) {
    console.error("TOTP enrolment confirmation failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
