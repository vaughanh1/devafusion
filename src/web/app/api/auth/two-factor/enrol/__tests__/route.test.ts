import { afterEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  findByUserIdMock,
  upsertTwoFactorSecretMock,
  setRequiredFactorsMock,
  deleteAllByUserIdMock,
  insertManyMock,
  renderTotpQrCodeDataUriMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  upsertTwoFactorSecretMock: vi.fn(),
  setRequiredFactorsMock: vi.fn(),
  deleteAllByUserIdMock: vi.fn(),
  insertManyMock: vi.fn(),
  renderTotpQrCodeDataUriMock: vi.fn(),
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
    upsertTwoFactorSecret = upsertTwoFactorSecretMock;
    setRequiredFactors = setRequiredFactorsMock;
  },
}));

vi.mock("@/features/auth/mfa/drizzle-backup-codes-repository", () => ({
  DrizzleBackupCodesRepository: class {
    deleteAllByUserId = deleteAllByUserIdMock;
    insertMany = insertManyMock;
  },
}));

vi.mock("@/features/auth/mfa/totp-qr-code", () => ({
  renderTotpQrCodeDataUri: renderTotpQrCodeDataUriMock,
}));

import { POST } from "@/app/api/auth/two-factor/enrol/route";

describe("POST /api/auth/two-factor/enrol", () => {
  afterEach(() => {
    getSessionMock.mockReset();
    findByUserIdMock.mockReset();
    upsertTwoFactorSecretMock.mockReset();
    setRequiredFactorsMock.mockReset();
    deleteAllByUserIdMock.mockReset();
    insertManyMock.mockReset();
    renderTotpQrCodeDataUriMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 409 when TOTP is already enabled for this account", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true, requiredFactors: ["password", "totp"] });

    const response = await POST();
    expect(response.status).toBe(409);
  });

  it("returns a QR data URI, manual-entry secret, and 8 backup codes on success", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue(undefined);
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    const response = await POST();
    const body = await response.json();

    expect(body.qrCodeDataUri).toBe("data:image/png;base64,abc123");
    expect(typeof body.manualEntrySecret).toBe("string");
    expect(body.backupCodes).toHaveLength(8);
  });

  it("upserts the plaintext secret and adds 'totp' to requiredFactors when not already present", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ requiredFactors: ["password"], twoFactorEnabled: false });
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST();

    expect(upsertTwoFactorSecretMock).toHaveBeenCalledWith("u1", expect.any(String));
    expect(setRequiredFactorsMock).toHaveBeenCalledWith("u1", ["password", "totp"]);
  });

  it("does not duplicate 'totp' in requiredFactors if it is already present", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ requiredFactors: ["password", "totp"], twoFactorEnabled: false });
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST();

    expect(setRequiredFactorsMock).not.toHaveBeenCalled();
  });

  it("replaces any prior backup codes rather than appending to them", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue(undefined);
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST();

    expect(deleteAllByUserIdMock).toHaveBeenCalledWith("u1");
    expect(insertManyMock).toHaveBeenCalledWith("u1", expect.arrayContaining([expect.any(String)]));
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    getSessionMock.mockRejectedValue(new Error("network down"));

    const response = await POST();
    expect(response.status).toBe(500);
  });
});
