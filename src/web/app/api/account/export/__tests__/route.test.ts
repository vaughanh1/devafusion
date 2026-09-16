import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via
// vi.hoisted rather than a plain const.
const { getSessionMock, findByUserIdMock, consumeRateLimitMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
  },
}));

// ADR-0014: this route now rate-limits before doing anything else -
// mocked here rather than exercising the real Postgres-backed
// implementation, which is covered by features/auth's own tests.
vi.mock("@/features/auth/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/account/export/route";

function buildRequest() {
  return new NextRequest("https://devafusion.net/api/account/export");
}

describe("GET /api/account/export", () => {
  afterEach(() => {
    getSessionMock.mockReset();
    findByUserIdMock.mockReset();
    consumeRateLimitMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue(null);

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
  });

  it("returns the user's own data, excluding the raw MFA secret", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockResolvedValue({
      user: {
        id: "u1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        emailVerified: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      session: {
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-08T00:00:00.000Z",
      },
    });
    findByUserIdMock.mockResolvedValue({
      userId: "u1",
      twoFactorSecret: "should-never-appear-in-export",
      twoFactorEnabled: true,
    });

    const response = await GET(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: "u1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(body.security).toEqual({ twoFactorEnabled: true });
    expect(JSON.stringify(body)).not.toContain("should-never-appear-in-export");
  });

  it("returns 500 when the session lookup throws", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true });
    getSessionMock.mockRejectedValue(new Error("db down"));

    const response = await GET(buildRequest());

    expect(response.status).toBe(500);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });

    const response = await GET(buildRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("X-Retry-After")).toBe("30");
    expect(getSessionMock).not.toHaveBeenCalled();
  });
});
