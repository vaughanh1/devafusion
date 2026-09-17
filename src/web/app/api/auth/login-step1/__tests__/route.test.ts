import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via
// vi.hoisted rather than a plain const, mirroring
// app/api/account/export/__tests__/route.test.ts's established
// pattern.
const {
  signInEmailMock,
  getSessionMock,
  findByUserIdMock,
  findValidByIdMock,
  verifyTurnstileTokenMock,
  sendEmailOtpMock,
  setMfaSessionMock,
} = vi.hoisted(() => ({
  signInEmailMock: vi.fn(),
  getSessionMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  findValidByIdMock: vi.fn(),
  verifyTurnstileTokenMock: vi.fn(),
  sendEmailOtpMock: vi.fn(),
  setMfaSessionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: {
    api: {
      signInEmail: signInEmailMock,
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-trusted-devices-repository", () => ({
  DrizzleTrustedDevicesRepository: class {
    findValidById = findValidByIdMock;
  },
}));

vi.mock("@/features/auth/verify-turnstile-token", () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock,
}));

vi.mock("@/features/auth/mfa/send-email-otp", () => ({
  sendEmailOtp: sendEmailOtpMock,
}));

vi.mock("@/features/auth/mfa/mfa-session-cache", () => ({
  setMfaSession: setMfaSessionMock,
}));

import { POST } from "@/app/api/auth/login-step1/route";

function buildRequest(
  body: Record<string, unknown>,
  cookieHeader?: string,
) {
  return new Request("https://devafusion.net/api/auth/login-step1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

function buildSignInResponse(cookies: string[]) {
  const headers = new Headers();
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return { ok: true, headers };
}

const validBody = {
  email: "ada@example.com",
  password: "correct-horse-battery",
  captchaToken: "test-captcha-token",
  formTimingToken: "test-timing-token",
};

describe("POST /api/auth/login-step1", () => {
  afterEach(() => {
    signInEmailMock.mockReset();
    getSessionMock.mockReset();
    findByUserIdMock.mockReset();
    findValidByIdMock.mockReset();
    verifyTurnstileTokenMock.mockReset();
    sendEmailOtpMock.mockReset();
    setMfaSessionMock.mockReset();
  });

  it("returns 400 for a malformed request body", async () => {
    const response = await POST(buildRequest({ email: "not-an-email" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when the captcha fails verification", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(false);

    const response = await POST(buildRequest(validBody));

    expect(response.status).toBe(400);
    expect(signInEmailMock).not.toHaveBeenCalled();
  });

  it("returns 401 with a generic message when signInEmail rejects the credentials", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue({ ok: false, headers: new Headers() });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Invalid email or password.");
  });

  it("forwards formTimingToken into signInEmail's body", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue(undefined);

    await POST(buildRequest(validBody));

    expect(signInEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ formTimingToken: "test-timing-token" }),
      }),
    );
  });

  it("returns 500 when the freshly minted session cannot be read back", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue(null);

    const response = await POST(buildRequest(validBody));
    expect(response.status).toBe(500);
  });

  it("releases the minted session cookies and reports mfaRequired: false for a password-only policy", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue({
      requiredFactors: ["password"],
      mfaFrequency: "always",
    });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(body).toEqual({ mfaRequired: false });
    expect(response.headers.get("set-cookie")).toContain("session=abc123");
    expect(setMfaSessionMock).not.toHaveBeenCalled();
  });

  it("defaults to ['password', 'totp'] when the user has no user_security row yet", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue(undefined);

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(body.mfaRequired).toBe(true);
    expect(body.nextFactorNeeded).toBe("totp");
  });

  it("bypasses MFA when a valid trusted-device cookie is presented and mfaFrequency is 30_days", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue({
      requiredFactors: ["password", "totp"],
      mfaFrequency: "30_days",
    });
    findValidByIdMock.mockResolvedValue({ id: "device-1", expiresAt: new Date() });

    const response = await POST(
      buildRequest(validBody, "devafusion-trusted-device=device-1"),
    );
    const body = await response.json();

    expect(body).toEqual({ mfaRequired: false });
    expect(setMfaSessionMock).not.toHaveBeenCalled();
  });

  it("falls through to full MFA evaluation when the trusted-device token is invalid, even with mfaFrequency 30_days", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue({
      requiredFactors: ["password", "totp"],
      mfaFrequency: "30_days",
    });
    findValidByIdMock.mockResolvedValue(undefined);

    const response = await POST(
      buildRequest(validBody, "devafusion-trusted-device=some-unknown-device"),
    );
    const body = await response.json();

    expect(body.mfaRequired).toBe(true);
  });

  it("dispatches an email OTP and stores the expected code in the cache when the next factor is email", async () => {
    verifyTurnstileTokenMock.mockResolvedValue(true);
    signInEmailMock.mockResolvedValue(buildSignInResponse(["session=abc123"]));
    getSessionMock.mockResolvedValue({
      user: { id: "u1", email: "ada@example.com" },
    });
    findByUserIdMock.mockResolvedValue({
      requiredFactors: ["password", "email"],
      mfaFrequency: "always",
    });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(body.nextFactorNeeded).toBe("email");
    expect(sendEmailOtpMock).toHaveBeenCalledWith(
      "ada@example.com",
      expect.stringMatching(/^\d{6}$/),
    );
    expect(setMfaSessionMock).toHaveBeenCalledWith(
      body.pendingToken,
      expect.objectContaining({
        currentFactorExpectedCode: expect.stringMatching(/^\d{6}$/),
      }),
    );
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    verifyTurnstileTokenMock.mockRejectedValue(new Error("network down"));

    const response = await POST(buildRequest(validBody));
    expect(response.status).toBe(500);
  });
});
