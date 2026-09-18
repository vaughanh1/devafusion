import { randomBytes, randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { DrizzleTrustedDevicesRepository } from "@/features/auth/mfa/drizzle-trusted-devices-repository";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { loginStep1RequestSchema } from "@/features/auth/mfa/login-step1.zod";
import type { MfaSessionState } from "@/features/auth/mfa/mfa-session-cache";
import { setMfaSession } from "@/features/auth/mfa/mfa-session-cache";
import { sendEmailOtp } from "@/features/auth/mfa/send-email-otp";
import { NO_TRUSTED_CLIENT_IP, resolveClientIp } from "@/features/auth/client-ip";
import { TRUSTED_DEVICE_COOKIE_NAME } from "@/features/auth/mfa/trusted-device-cookie";
import { verifyTurnstileToken } from "@/features/auth/verify-turnstile-token";

// UK GDPR Article 25 default when a user has no user_security row yet
// (never enrolled) - matches db/schema.ts's own column default
// exactly, so an unenrolled account is challenged identically to a
// freshly inserted row rather than accidentally trusted as
// password-only.
const DEFAULT_REQUIRED_FACTORS = ["password", "totp"];

const trustedDevicesRepository = new DrizzleTrustedDevicesRepository();
const userSecurityRepository = new DrizzleUserSecurityRepository();

function extractTrustedDeviceToken(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${TRUSTED_DEVICE_COOKIE_NAME}=`));

  return match?.slice(TRUSTED_DEVICE_COOKIE_NAME.length + 1);
}

// This project's installed better-auth@^1.7.5 has no
// "dontCreateSession" body flag on signInEmail (confirmed directly
// against node_modules/better-auth/dist/api/routes/sign-in.mjs's zod
// body schema: email/password/callbackURL/rememberMe only) and no
// public auth.api.createSession surface to mint a session later
// (internalAdapter.createSession is not re-exported on auth.api).
// This route therefore always lets Better Auth's own signInEmail
// mint a real session using its own real password-hash verification
// (the only way to authoritatively check the password without
// duplicating Better Auth's hashing scheme), then either releases
// that session's Set-Cookie immediately (password-only or trusted-
// device bypass) or withholds it inside the MFA progress cache until
// every remaining factor passes (see two-factor/verify/route.ts).
//
// Turnstile is verified manually here (verifyTurnstileToken), not
// via Better Auth's captcha plugin's own onRequest hook - that hook
// only fires on Better Auth's router dispatch pipeline, which a
// direct auth.api.signInEmail() call bypasses entirely (confirmed
// against the installed plugin source; the identical bypass ADR-0014
// already documents for the rate-limit plugin applies here too).
export async function POST(request: Request) {
  // Explicit server-side error handling (src/web/AGENTS.md) - every
  // branch below either returns a Response or is caught, never an
  // unhandled rejection.
  try {
    const body = await request.json();
    const parsed = loginStep1RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { email, password, captchaToken, formTimingToken } = parsed.data;
    const clientIp = resolveClientIp(request);

    const captchaVerified = await verifyTurnstileToken(
      captchaToken,
      clientIp === NO_TRUSTED_CLIENT_IP ? undefined : clientIp,
    );
    if (!captchaVerified) {
      return NextResponse.json(
        { error: "Captcha verification failed." },
        { status: 400 },
      );
    }

    // auth.ts's hooks.before timing-token check runs for this direct
    // auth.api call too (confirmed against better-auth's own
    // dispatch.mjs - runBeforeHooks reads the raw input body before
    // the endpoint's own zod schema validates/strips it, so an extra
    // field survives to reach verifyFormTimingToken exactly as it
    // does for the client-side authClient.signUp.email proxy path -
    // see sign-up-form.tsx's identical comment). signInEmail's own
    // typed body parameter has no formTimingToken field, so this is
    // widened rather than narrowed; the field is still real and
    // still required at runtime.
    const signInResponse = await auth.api.signInEmail({
      body: { email, password, formTimingToken } as { email: string; password: string },
      asResponse: true,
    });

    if (!signInResponse.ok) {
      // Better Auth's own signInEmail throws a distinct 403
      // EMAIL_NOT_VERIFIED (confirmed directly against the installed
      // package's sign-in.mjs) rather than the generic 401 an actual
      // wrong password produces - surfaced here as its own status so
      // the frontend can show "please verify your email" rather than
      // the deliberately generic "Invalid email or password."
      // (account-enumeration rationale, this route's own existing
      // comment) that a genuine credential mismatch still gets.
      if (signInResponse.status === 403) {
        return NextResponse.json(
          {
            error:
              "Please verify your email address before signing in. Check your inbox for a verification link.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const mintedCookies = signInResponse.headers.getSetCookie();
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: mintedCookies.join("; ") }),
    });

    if (!session) {
      // Better Auth reported success but the freshly minted session
      // cannot be read back - fail closed rather than proceed with
      // policy evaluation against a user we cannot identify.
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }

    const userId = session.user.id;
    const security = await userSecurityRepository.findByUserId(userId);
    const requiredFactors =
      security?.requiredFactors ?? DEFAULT_REQUIRED_FACTORS;
    const mfaFrequency = security?.mfaFrequency ?? "always";

    // Trusted-device bypass (mfa_frequency = '30_days') - only ever
    // skips factors beyond password, and only when a valid, non-
    // expired, user-matched token is presented. A missing/expired/
    // mismatched token always falls through to full evaluation
    // below, never silently trusts.
    if (mfaFrequency === "30_days") {
      const trustedDeviceToken = extractTrustedDeviceToken(request);
      if (trustedDeviceToken) {
        const validDevice = await trustedDevicesRepository.findValidById(
          trustedDeviceToken,
          userId,
        );
        if (validDevice) {
          const response = NextResponse.json({ mfaRequired: false });
          for (const cookie of mintedCookies) {
            response.headers.append("Set-Cookie", cookie);
          }
          return response;
        }
      }
    }

    const remainingFactors = requiredFactors.filter(
      (factor) => factor !== "password",
    );

    // Password-only policy - release the already-minted session
    // immediately, no MFA cache entry needed.
    if (remainingFactors.length === 0) {
      const response = NextResponse.json({ mfaRequired: false });
      for (const cookie of mintedCookies) {
        response.headers.append("Set-Cookie", cookie);
      }
      return response;
    }

    const pendingToken = randomBytes(16).toString("hex");
    const nextFactor = remainingFactors[0]!;

    const state: MfaSessionState = {
      userId,
      email: session.user.email,
      completedFactors: ["password"],
      remainingFactors,
      pendingSessionCookies: mintedCookies,
      timestamp: Date.now(),
    };

    if (nextFactor === "email") {
      // crypto.randomInt, not Math.random - a credential-equivalent
      // one-time code needs a cryptographically secure source.
      const emailOtpCode = randomInt(100000, 1000000).toString();
      state.currentFactorExpectedCode = emailOtpCode;
      await sendEmailOtp(session.user.email, emailOtpCode);
    }

    setMfaSession(pendingToken, state);

    return NextResponse.json({
      mfaRequired: true,
      pendingToken,
      nextFactorNeeded: nextFactor,
    });
  } catch (error) {
    console.error("Login step 1 failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
