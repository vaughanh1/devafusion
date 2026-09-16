import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via
// vi.hoisted rather than a plain const.
const { getSessionMock, findByUserIdMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  findByUserIdMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { GET } from "@/app/api/account/export/route";

describe("GET /api/account/export", () => {
  afterEach(() => {
    getSessionMock.mockReset();
    findByUserIdMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns the user's own data, excluding the raw MFA secret", async () => {
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

    const response = await GET();
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
    getSessionMock.mockRejectedValue(new Error("db down"));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
