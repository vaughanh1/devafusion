import { afterEach, describe, expect, it, vi } from "vitest";

const {
  consumeRateLimitMock,
  findByUserIdMock,
  setMfaFrequencyMock,
  findUnusedByUserIdMock,
  markUsedMock,
  createTrustedDeviceMock,
  getMfaSessionMock,
  deleteMfaSessionMock,
  setMfaSessionMock,
  sendEmailOtpMock,
} = vi.hoisted(() => ({
  consumeRateLimitMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  setMfaFrequencyMock: vi.fn(),
  findUnusedByUserIdMock: vi.fn(),
  markUsedMock: vi.fn(),
  createTrustedDeviceMock: vi.fn(),
  getMfaSessionMock: vi.fn(),
  deleteMfaSessionMock: vi.fn(),
  setMfaSessionMock: vi.fn(),
  sendEmailOtpMock: vi.fn(),
}));

vi.mock("@/features/auth/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
    setMfaFrequency = setMfaFrequencyMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-backup-codes-repository", () => ({
  DrizzleBackupCodesRepository: class {
    findUnusedByUserId = findUnusedByUserIdMock;
    markUsed = markUsedMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-trusted-devices-repository", () => ({
  DrizzleTrustedDevicesRepository: class {
    create = createTrustedDeviceMock;
  },
}));

vi.mock("@/features/auth/mfa/mfa-session-cache", () => ({
  getMfaSession: getMfaSessionMock,
  deleteMfaSession: deleteMfaSessionMock,
  setMfaSession: setMfaSessionMock,
}));

vi.mock("@/features/auth/mfa/send-email-otp", () => ({
  sendEmailOtp: sendEmailOtpMock,
}));

vi.mock("@/features/auth/mfa/backup-code-hash", () => ({
  verifyBackupCode: (code: string, hash: string) => code === hash,
}));

import * as OTPAuth from "otpauth";

import { POST } from "@/app/api/auth/two-factor/verify/route";

function buildRequest(body: Record<string, unknown>) {
  return new Request("https://devafusion.net/api/auth/two-factor/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "test-agent" },
    body: JSON.stringify(body),
  });
}

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    userId: "u1",
    email: "ada@example.com",
    completedFactors: ["password"],
    remainingFactors: ["totp"],
    pendingSessionCookies: ["session=abc123"],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("POST /api/auth/two-factor/verify", () => {
  afterEach(() => {
    consumeRateLimitMock.mockReset();
    findByUserIdMock.mockReset();
    setMfaFrequencyMock.mockReset();
    findUnusedByUserIdMock.mockReset();
    markUsedMock.mockReset();
    createTrustedDeviceMock.mockReset();
    getMfaSessionMock.mockReset();
    deleteMfaSessionMock.mockReset();
    setMfaSessionMock.mockReset();
    sendEmailOtpMock.mockReset();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 10 });

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "totp" }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("X-Retry-After")).toBe("10");
    expect(getMfaSessionMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed request body", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });

    const response = await POST(buildRequest({ pendingToken: "t1" }));
    expect(response.status).toBe(400);
  });

  it("returns 410 when the pending token has expired or was never set", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(undefined);

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "totp" }),
    );

    expect(response.status).toBe(410);
  });

  it("deletes the pending session before any code comparison (single-use consumption)", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    findByUserIdMock.mockResolvedValue({
      twoFactorSecret: null,
      twoFactorEnabled: false,
    });

    await POST(buildRequest({ pendingToken: "t1", code: "000000", factorType: "totp" }));

    expect(deleteMfaSessionMock).toHaveBeenCalledWith("t1");
  });

  it("returns 400 when the submitted factorType does not match the top of remainingFactors", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(
      buildState({ remainingFactors: ["totp", "email"] }),
    );

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "email" }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when TOTP is submitted but not actually enabled for the account", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    findByUserIdMock.mockResolvedValue({ twoFactorSecret: null, twoFactorEnabled: false });

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "totp" }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 401 for an invalid TOTP code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    const secret = new OTPAuth.Secret({ size: 20 });
    findByUserIdMock.mockResolvedValue({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true,
    });

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "000000", factorType: "totp" }),
    );

    expect(response.status).toBe(401);
  });

  it("accepts a valid TOTP code and releases the session cookies when it is the last factor", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ secret });
    findByUserIdMock.mockResolvedValue({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true,
    });

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: totp.generate(), factorType: "totp" }),
    );
    const body = await response.json();

    expect(body).toEqual({ verified: true });
    expect(response.headers.get("set-cookie")).toContain("session=abc123");
  });

  it("returns 401 for a mismatched email code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(
      buildState({ remainingFactors: ["email"], currentFactorExpectedCode: "123456" }),
    );

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "000000", factorType: "email" }),
    );

    expect(response.status).toBe(401);
  });

  it("accepts a matching email code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(
      buildState({ remainingFactors: ["email"], currentFactorExpectedCode: "123456" }),
    );

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "email" }),
    );
    const body = await response.json();

    expect(body).toEqual({ verified: true });
  });

  it("burns the specific backup code on a successful backup_code verification", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    findUnusedByUserIdMock.mockResolvedValue([
      { id: "code-1", hashedCode: "AAAA1111BBBB" },
      { id: "code-2", hashedCode: "CCCC2222DDDD" },
    ]);

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "AAAA1111BBBB", factorType: "backup_code" }),
    );
    const body = await response.json();

    expect(body).toEqual({ verified: true });
    expect(markUsedMock).toHaveBeenCalledWith("code-1");
  });

  it("returns 401 for a backup code that does not match any unused code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState());
    findUnusedByUserIdMock.mockResolvedValue([{ id: "code-1", hashedCode: "AAAA1111BBBB" }]);

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "WRONGCODE123", factorType: "backup_code" }),
    );

    expect(response.status).toBe(401);
    expect(markUsedMock).not.toHaveBeenCalled();
  });

  it("chains to the next factor with a fresh pendingToken when factors remain (202)", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(buildState({ remainingFactors: ["totp", "email"] }));
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ secret });
    findByUserIdMock.mockResolvedValue({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: true,
    });

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: totp.generate(), factorType: "totp" }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body.verified).toBe(false);
    expect(body.nextFactorNeeded).toBe("email");
    expect(sendEmailOtpMock).toHaveBeenCalledWith(
      "ada@example.com",
      expect.stringMatching(/^\d{6}$/),
    );
    expect(setMfaSessionMock).toHaveBeenCalledWith(
      body.pendingToken,
      expect.objectContaining({ remainingFactors: ["email"] }),
    );
  });

  it("registers a trusted device and sets the cookie when trustDevice is true and the matrix is complete", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(
      buildState({ remainingFactors: ["email"], currentFactorExpectedCode: "123456" }),
    );

    const response = await POST(
      buildRequest({
        pendingToken: "t1",
        code: "123456",
        factorType: "email",
        trustDevice: true,
      }),
    );

    expect(createTrustedDeviceMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", deviceLabel: "test-agent" }),
    );
    expect(response.headers.get("set-cookie")).toContain("devafusion-trusted-device=");
    // Regression test for a real, reported lockout: checking "trust
    // this device" here created a genuinely valid trusted_devices
    // row, but login-step1.ts only ever consults it when
    // user_security.mfa_frequency is '30_days' - this call was
    // previously missing entirely, so the row was silently ignored
    // on every subsequent login.
    expect(setMfaFrequencyMock).toHaveBeenCalledWith("u1", "30_days");
  });

  it("does NOT touch mfa_frequency when trustDevice is not set", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getMfaSessionMock.mockReturnValue(
      buildState({ remainingFactors: ["email"], currentFactorExpectedCode: "123456" }),
    );

    await POST(
      buildRequest({
        pendingToken: "t1",
        code: "123456",
        factorType: "email",
      }),
    );

    expect(setMfaFrequencyMock).not.toHaveBeenCalled();
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    consumeRateLimitMock.mockRejectedValue(new Error("network down"));

    const response = await POST(
      buildRequest({ pendingToken: "t1", code: "123456", factorType: "totp" }),
    );
    expect(response.status).toBe(500);
  });
});
