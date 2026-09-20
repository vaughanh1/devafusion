import { afterEach, describe, expect, it, vi } from "vitest";

const {
  consumeRateLimitMock,
  getSessionMock,
  verifyPasswordMock,
  findByUserIdMock,
  setRequiredFactorsMock,
  setMfaFrequencyMock,
  setTwoFactorEnabledMock,
  clearTwoFactorSecretMock,
  recordAuthAuditLogMock,
  trustedDevicesCreateMock,
} = vi.hoisted(() => ({
  consumeRateLimitMock: vi.fn(),
  getSessionMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  setRequiredFactorsMock: vi.fn(),
  setMfaFrequencyMock: vi.fn(),
  setTwoFactorEnabledMock: vi.fn(),
  clearTwoFactorSecretMock: vi.fn(),
  recordAuthAuditLogMock: vi.fn(),
  trustedDevicesCreateMock: vi.fn(),
}));

vi.mock("@/features/auth/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

vi.mock("@/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
      verifyPassword: verifyPasswordMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
    setRequiredFactors = setRequiredFactorsMock;
    setMfaFrequency = setMfaFrequencyMock;
    setTwoFactorEnabled = setTwoFactorEnabledMock;
    clearTwoFactorSecret = clearTwoFactorSecretMock;
  },
}));

vi.mock("@/features/auth/mfa/auth-audit-log", () => ({
  recordAuthAuditLog: recordAuthAuditLogMock,
}));

vi.mock("@/features/auth/mfa/drizzle-trusted-devices-repository", () => ({
  DrizzleTrustedDevicesRepository: class {
    create = trustedDevicesCreateMock;
  },
}));

import { POST } from "@/app/api/user/security/settings/route";

function buildRequest(body: Record<string, unknown>) {
  return new Request("https://devafusion.net/api/user/security/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  password: "correct-horse-battery",
  requiredFactors: ["password", "totp"],
  mfaFrequency: "always",
};

describe("POST /api/user/security/settings", () => {
  afterEach(() => {
    consumeRateLimitMock.mockReset();
    getSessionMock.mockReset();
    verifyPasswordMock.mockReset();
    findByUserIdMock.mockReset();
    setRequiredFactorsMock.mockReset();
    setMfaFrequencyMock.mockReset();
    setTwoFactorEnabledMock.mockReset();
    clearTwoFactorSecretMock.mockReset();
    recordAuthAuditLogMock.mockReset();
    trustedDevicesCreateMock.mockReset();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 15 });

    const response = await POST(buildRequest(validBody));
    expect(response.status).toBe(429);
  });

  it("returns 401 when there is no session", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue(null);

    const response = await POST(buildRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a malformed request body", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const response = await POST(buildRequest({ requiredFactors: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a weaker-than-default policy without risk acknowledgement", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const response = await POST(
      buildRequest({ ...validBody, requiredFactors: ["password"] }),
    );
    expect(response.status).toBe(400);
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it("accepts a weaker-than-default policy when risk is acknowledged", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    verifyPasswordMock.mockResolvedValue({ status: true });

    const response = await POST(
      buildRequest({ ...validBody, requiredFactors: ["password"], riskAcknowledged: true }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 401 when the password is incorrect", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
    verifyPasswordMock.mockRejectedValue(new Error("wrong password"));

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Incorrect password.");
    expect(setRequiredFactorsMock).not.toHaveBeenCalled();
  });

  // Regression tests for a real, reported account lockout: nothing
  // previously stopped a user from saving 'totp' as a required
  // factor without ever confirming it - login-step1.ts would then
  // require a factor with no working secret behind it at all.
  describe("blocks newly requiring 'totp' before it is actually confirmed", () => {
    it("returns 400 when requiredFactors includes 'totp' and the account has no confirmed TOTP factor at all", async () => {
      consumeRateLimitMock.mockResolvedValue({ allowed: true });
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      findByUserIdMock.mockResolvedValue(undefined);

      const response = await POST(buildRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/finish setting up your authenticator app/i);
      expect(verifyPasswordMock).not.toHaveBeenCalled();
      expect(setRequiredFactorsMock).not.toHaveBeenCalled();
    });

    it("returns 400 when requiredFactors includes 'totp' and the existing row has twoFactorEnabled: false", async () => {
      consumeRateLimitMock.mockResolvedValue({ allowed: true });
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      findByUserIdMock.mockResolvedValue({ twoFactorEnabled: false });

      const response = await POST(buildRequest(validBody));

      expect(response.status).toBe(400);
      expect(setRequiredFactorsMock).not.toHaveBeenCalled();
    });

    it("allows saving when 'totp' is already genuinely confirmed", async () => {
      consumeRateLimitMock.mockResolvedValue({ allowed: true });
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
      verifyPasswordMock.mockResolvedValue({ status: true });

      const response = await POST(buildRequest(validBody));

      expect(response.status).toBe(200);
      expect(setRequiredFactorsMock).toHaveBeenCalledWith("u1", ["password", "totp"]);
    });

    it("does not check confirmation state at all when 'totp' is not in requiredFactors", async () => {
      consumeRateLimitMock.mockResolvedValue({ allowed: true });
      getSessionMock.mockResolvedValue({ user: { id: "u1" } });
      verifyPasswordMock.mockResolvedValue({ status: true });

      const response = await POST(
        buildRequest({ ...validBody, requiredFactors: ["password", "email"] }),
      );

      expect(response.status).toBe(200);
      expect(findByUserIdMock).not.toHaveBeenCalled();
    });
  });

  it("updates requiredFactors and mfaFrequency, and records an audit log entry, on success", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
    verifyPasswordMock.mockResolvedValue({ status: true });

    const response = await POST(buildRequest(validBody));
    const body = await response.json();

    expect(body).toEqual({ updated: true });
    expect(setRequiredFactorsMock).toHaveBeenCalledWith("u1", ["password", "totp"]);
    expect(setMfaFrequencyMock).toHaveBeenCalledWith("u1", "always");
    expect(recordAuthAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", action: "security_settings_updated" }),
    );
  });

  it("zeroes out the TOTP secret and disables it when 'totp' is removed from requiredFactors", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    verifyPasswordMock.mockResolvedValue({ status: true });

    await POST(buildRequest({ ...validBody, requiredFactors: ["password", "email"] }));

    expect(setTwoFactorEnabledMock).toHaveBeenCalledWith("u1", false);
    expect(clearTwoFactorSecretMock).toHaveBeenCalledWith("u1");
  });

  it("does not touch the TOTP secret when 'totp' remains in requiredFactors", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
    verifyPasswordMock.mockResolvedValue({ status: true });

    await POST(buildRequest(validBody));

    expect(setTwoFactorEnabledMock).not.toHaveBeenCalled();
    expect(clearTwoFactorSecretMock).not.toHaveBeenCalled();
  });

  it("trusts the current device and sets the trusted-device cookie when mfaFrequency is '30_days'", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
    verifyPasswordMock.mockResolvedValue({ status: true });

    const response = await POST(
      buildRequest({ ...validBody, mfaFrequency: "30_days" }),
    );

    expect(trustedDevicesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" }),
    );
    expect(response.headers.get("set-cookie")).toContain(
      "devafusion-trusted-device=",
    );
  });

  it("does not trust the current device when mfaFrequency is 'always'", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true });
    verifyPasswordMock.mockResolvedValue({ status: true });

    const response = await POST(buildRequest(validBody));

    expect(trustedDevicesCreateMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    consumeRateLimitMock.mockRejectedValue(new Error("network down"));

    const response = await POST(buildRequest(validBody));
    expect(response.status).toBe(500);
  });
});
