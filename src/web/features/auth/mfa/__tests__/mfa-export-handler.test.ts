import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock factories are hoisted above top-level variable declarations,
// so the mock functions they reference must be created via
// vi.hoisted rather than a plain const.
const { findByUserIdMock, countUnusedByUserIdMock, listByUserIdMock } = vi.hoisted(() => ({
  findByUserIdMock: vi.fn(),
  countUnusedByUserIdMock: vi.fn(),
  listByUserIdMock: vi.fn(),
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-backup-codes-repository", () => ({
  DrizzleBackupCodesRepository: class {
    countUnusedByUserId = countUnusedByUserIdMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-trusted-devices-repository", () => ({
  DrizzleTrustedDevicesRepository: class {
    listByUserId = listByUserIdMock;
  },
}));

import { buildMfaExportPayload } from "../mfa-export-handler";

describe("buildMfaExportPayload", () => {
  afterEach(() => {
    findByUserIdMock.mockReset();
    countUnusedByUserIdMock.mockReset();
    listByUserIdMock.mockReset();
  });

  it("never includes the raw two-factor secret, even though findByUserId returns one", async () => {
    findByUserIdMock.mockResolvedValue({
      userId: "u1",
      requiredFactors: ["password", "totp"],
      mfaFrequency: "always",
      twoFactorSecret: "should-never-appear-in-export",
      twoFactorEnabled: true,
    });
    countUnusedByUserIdMock.mockResolvedValue(8);
    listByUserIdMock.mockResolvedValue([]);

    const payload = await buildMfaExportPayload("u1");

    expect(JSON.stringify(payload)).not.toContain("should-never-appear-in-export");
    expect(Object.keys(payload)).not.toContain("twoFactorSecret");
  });

  it("never includes a trusted device's opaque lookup token, only its label and expiry", async () => {
    findByUserIdMock.mockResolvedValue(undefined);
    countUnusedByUserIdMock.mockResolvedValue(0);
    listByUserIdMock.mockResolvedValue([
      {
        id: "should-never-appear-in-export-token",
        deviceLabel: "Chrome on Windows",
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    const payload = await buildMfaExportPayload("u1");

    expect(JSON.stringify(payload)).not.toContain("should-never-appear-in-export-token");
    expect(payload.trustedDevices).toEqual([
      { deviceLabel: "Chrome on Windows", expiresAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  it("falls back to the UK GDPR Article 25 defaults when no user_security row exists yet", async () => {
    findByUserIdMock.mockResolvedValue(undefined);
    countUnusedByUserIdMock.mockResolvedValue(0);
    listByUserIdMock.mockResolvedValue([]);

    const payload = await buildMfaExportPayload("u1");

    expect(payload.requiredFactors).toEqual(["password", "totp"]);
    expect(payload.mfaFrequency).toBe("always");
    expect(payload.twoFactorEnabled).toBe(false);
  });

  it("reports the real unused backup code count", async () => {
    findByUserIdMock.mockResolvedValue(undefined);
    countUnusedByUserIdMock.mockResolvedValue(5);
    listByUserIdMock.mockResolvedValue([]);

    const payload = await buildMfaExportPayload("u1");

    expect(payload.unusedBackupCodeCount).toBe(5);
  });
});
