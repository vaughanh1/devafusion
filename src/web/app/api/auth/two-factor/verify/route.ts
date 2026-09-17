import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";

import { DrizzleBackupCodesRepository } from "@/features/auth/mfa/drizzle-backup-codes-repository";
import { DrizzleTrustedDevicesRepository } from "@/features/auth/mfa/drizzle-trusted-devices-repository";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { verifyBackupCode } from "@/features/auth/mfa/backup-code-hash";
import {
  deleteMfaSession,
  getMfaSession,
  setMfaSession,
} from "@/features/auth/mfa/mfa-session-cache";
import type { MfaSessionState } from "@/features/auth/mfa/mfa-session-cache";
import { sendEmailOtp } from "@/features/auth/mfa/send-email-otp";
import {
  TRUSTED_DEVICE_COOKIE_NAME,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from "@/features/auth/mfa/trusted-device-cookie";
import { verifyFactorRequestSchema } from "@/features/auth/mfa/verify-factor.zod";
import { consumeRateLimit } from "@/features/auth/rate-limit";

const userSecurityRepository = new DrizzleUserSecurityRepository();
const backupCodesRepository = new DrizzleBackupCodesRepository();
const trustedDevicesRepository = new DrizzleTrustedDevicesRepository();

// ADR-0014: this route sits outside Better Auth's own router - by
// definition, at every point in this flow, no session has yet been
// released to the client, so there is nothing for auth.api.getSession
// to read and no way for Better Auth's own rateLimit plugin to
// throttle it. The self-built limiter in features/auth/rate-limit
// covers this gap, matching the sensitivity of a brute-forceable
// 6-digit TOTP/email code (the same rationale window: 1 below
// documents for TOTP's clock-drift tolerance).
const VERIFY_FACTOR_RATE_LIMIT = { windowMs: 10_000, max: 5 };

function releaseSessionCookies(response: NextResponse, cookies: string[]): void {
  for (const cookie of cookies) {
    response.headers.append("Set-Cookie", cookie);
  }
}


// Sequential MFA matrix verification (docs/adr's MFA-matrix slice) -
// replaces the earlier, session-gated, TOTP-only version of this
// route (no frontend ever called it - the prior slice's own log
// entry explicitly deferred MFA challenge UI). This route validates
// one factor per request against the in-progress state login-step1
// created, chaining to a fresh pendingToken when more factors remain
// or releasing the withheld session cookies once the matrix is fully
// satisfied.
export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const rateLimitResult = await consumeRateLimit(
      request,
      "/api/auth/two-factor/verify",
      VERIFY_FACTOR_RATE_LIMIT,
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

    const body = await request.json();
    const parsed = verifyFactorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { pendingToken, code, factorType, trustDevice } = parsed.data;

    const state = getMfaSession(pendingToken);
    if (!state) {
      return NextResponse.json(
        { error: "This verification session has expired. Please log in again." },
        { status: 410 },
      );
    }

    // SINGLE-USE PROGRESS CONSUMPTION: the old state is deleted
    // immediately, before any code comparison happens - a failed
    // verification below never leaves a reusable pending token
    // behind, neutralizing replay and brute-force code-stuffing
    // sweeps against the same token.
    deleteMfaSession(pendingToken);

    let backupCodeRecordId: string | undefined;

    if (factorType === "backup_code") {
      const unusedCodes = await backupCodesRepository.findUnusedByUserId(
        state.userId,
      );
      const match = unusedCodes.find((entry) =>
        verifyBackupCode(code, entry.hashedCode),
      );
      if (!match) {
        return NextResponse.json(
          { error: "Invalid or already-used backup code." },
          { status: 401 },
        );
      }
      backupCodeRecordId = match.id;
    } else if (state.remainingFactors[0] !== factorType) {
      // The submitted factorType must match the top of the sequence
      // - prevents skipping ahead or resubmitting an already-
      // completed factor type.
      return NextResponse.json(
        { error: "Unexpected factor type for this verification step." },
        { status: 400 },
      );
    } else if (factorType === "totp") {
      const security = await userSecurityRepository.findByUserId(state.userId);
      if (!security?.twoFactorSecret || !security.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is not enabled for this account." },
          { status: 409 },
        );
      }

      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(security.twoFactorSecret),
      });

      // window: 1 tolerates one 30s step of clock drift either side
      // (otpauth's own documented recommendation) - kept small
      // deliberately to limit brute-force exposure; the rate limiter
      // above is the primary defence against repeated guesses.
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return NextResponse.json(
          { error: "Invalid or expired code." },
          { status: 401 },
        );
      }
    } else if (factorType === "email") {
      // Constant-time comparison, matching
      // features/auth/form-timing-token.ts's established pattern - a
      // naive === leaks timing information about how many leading
      // characters matched.
      const expected = state.currentFactorExpectedCode;
      const codeBuffer = Buffer.from(code);
      const expectedBuffer = Buffer.from(expected ?? "");
      const codesMatch =
        !!expected &&
        codeBuffer.length === expectedBuffer.length &&
        timingSafeEqual(codeBuffer, expectedBuffer);

      if (!codesMatch) {
        return NextResponse.json(
          { error: "Invalid or expired code." },
          { status: 401 },
        );
      }
    }

    if (backupCodeRecordId) {
      await backupCodesRepository.markUsed(backupCodeRecordId);
    }

    const completedFactors = [...state.completedFactors, factorType];
    const remainingFactors = state.remainingFactors.filter(
      (factor) => factor !== factorType,
    );

    if (remainingFactors.length > 0) {
      const nextFactor = remainingFactors[0]!;
      const nextPendingToken = randomBytes(16).toString("hex");

      const nextState: MfaSessionState = {
        userId: state.userId,
        email: state.email,
        completedFactors,
        remainingFactors,
        pendingSessionCookies: state.pendingSessionCookies,
        timestamp: Date.now(),
      };

      if (nextFactor === "email") {
        const emailOtpCode = randomInt(100000, 1000000).toString();
        nextState.currentFactorExpectedCode = emailOtpCode;
        await sendEmailOtp(state.email, emailOtpCode);
      }

      setMfaSession(nextPendingToken, nextState);

      return NextResponse.json(
        {
          verified: false,
          nextFactorNeeded: nextFactor,
          pendingToken: nextPendingToken,
        },
        { status: 202 },
      );
    }

    // Every required factor is satisfied - release the session
    // Better Auth already minted back in login-step1, and optionally
    // register a trusted device.
    const response = NextResponse.json({ verified: true });
    releaseSessionCookies(response, state.pendingSessionCookies);

    if (trustDevice) {
      const trustedDeviceId = randomBytes(32).toString("hex");
      const expiresAt = new Date(
        Date.now() + TRUSTED_DEVICE_MAX_AGE_SECONDS * 1000,
      );

      await trustedDevicesRepository.create({
        id: trustedDeviceId,
        userId: state.userId,
        deviceLabel:
          request.headers.get("user-agent")?.slice(0, 255) ?? "Unknown device",
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
    console.error("MFA factor verification failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

