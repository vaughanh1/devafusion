import { afterEach, describe, expect, it, vi } from "vitest";
import * as OTPAuth from "otpauth";

const { consumeRateLimitMock, getSessionMock, findByUserIdMock, setTwoFactorEnabledMock } =
  vi.hoisted(() => ({
    consumeRateLimitMock: vi.fn(),
    getSessionMock: vi.fn(),
    findByUserIdMock: vi.fn(),
    setTwoFactorEnabledMock: vi.fn(),
  }));

vi.mock("@/features/auth/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
    setTwoFactorEnabled = setTwoFactorEnabledMock;
  },
}));

import { POST } from "@/app/api/auth/two-factor/confirm/route";

function buildRequest(body: Record<string, unknown>) {
  return new Request("https://devafusion.net/api/auth/two-factor/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/two-factor/confirm", () => {
  afterEach(() => {
    consumeRateLimitMock.mockReset();
    getSessionMock.mockReset();
    findByUserIdMock.mockReset();
    setTwoFactorEnabledMock.mockReset();
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 5 });

    const response = await POST(buildRequest({ code: "123456" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("X-Retry-After")).toBe("5");
  });

  it("returns 401 when there is no session", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue(null);

    const response = await POST(buildRequest({ code: "123456" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for a malformed code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });

    const response = await POST(buildRequest({ code: "not-6-digits" }));
    expect(response.status).toBe(400);
  });

  it("returns 409 when there is no pending TOTP enrolment", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    findByUserIdMock.mockResolvedValue({ twoFactorSecret: null });

    const response = await POST(buildRequest({ code: "123456" }));
    expect(response.status).toBe(409);
  });

  it("returns 401 for an invalid code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    const secret = new OTPAuth.Secret({ size: 20 });
    findByUserIdMock.mockResolvedValue({ twoFactorSecret: secret.base32 });

    const response = await POST(buildRequest({ code: "000000" }));
    expect(response.status).toBe(401);
    expect(setTwoFactorEnabledMock).not.toHaveBeenCalled();
  });

  it("enables TOTP for a valid code", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({ user: { id: "u1" } });
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ secret });
    findByUserIdMock.mockResolvedValue({ twoFactorSecret: secret.base32 });

    const response = await POST(buildRequest({ code: totp.generate() }));
    const body = await response.json();

    expect(body).toEqual({ enabled: true });
    expect(setTwoFactorEnabledMock).toHaveBeenCalledWith("u1", true);
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    consumeRateLimitMock.mockRejectedValue(new Error("network down"));

    const response = await POST(buildRequest({ code: "123456" }));
    expect(response.status).toBe(500);
  });
});
