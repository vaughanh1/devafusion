import { headers } from "next/headers";
import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { auth } from "@/auth";
import { decryptTwoFactorSecret } from "@/features/auth/mfa/two-factor-secret-cipher";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { verifyTotpRequestSchema } from "@/features/auth/mfa/verify-totp.zod";
import { consumeRateLimit } from "@/features/auth/rate-limit";

// Self-built TOTP verification (docs/adr/0012) - deliberately not Better
// Auth's own twoFactor plugin endpoint, since this project's secret is
// encrypted at rest and only this route (and the enrolment route,
// not yet built) ever decrypts it.
const userSecurityRepository = new DrizzleUserSecurityRepository();

// ADR-0014: this route sits outside Better Auth's own router (it calls
// auth.api.getSession directly rather than being dispatched through
// auth's endpoint pipeline), so Better Auth's own rateLimit plugin does
// not throttle it - the self-built limiter in features/auth/rate-limit
// covers this gap. A tight window/max here matches the sensitivity of
// a brute-forceable 6-digit TOTP code (the same rationale
// two-factor/verify's own window: 1 comment already documents for its
// clock-drift tolerance).
const TOTP_VERIFY_RATE_LIMIT = { windowMs: 10_000, max: 5 };

export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const rateLimitResult = await consumeRateLimit(
      request,
      "/api/auth/two-factor/verify",
      TOTP_VERIFY_RATE_LIMIT,
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
    const parsed = verifyTotpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const record = await userSecurityRepository.findByUserId(
      session.user.id,
    );
    if (!record?.twoFactorSecret || !record.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled for this account." },
        { status: 409 },
      );
    }

    const secret = decryptTwoFactorSecret(record.twoFactorSecret);
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // window: 1 tolerates one 30s step of clock drift either side - kept
    // small deliberately (otpauth's own documented recommendation) to
    // limit brute-force exposure. A rate limiter in front of this route
    // is a follow-up, not yet built.
    const delta = totp.validate({ token: parsed.data.code, window: 1 });

    if (delta === null) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 401 },
      );
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("TOTP verification failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
