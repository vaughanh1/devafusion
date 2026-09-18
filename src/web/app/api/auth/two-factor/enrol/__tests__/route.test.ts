import { afterEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  verifyPasswordMock,
  findByUserIdMock,
  upsertTwoFactorSecretMock,
  setRequiredFactorsMock,
  setTwoFactorEnabledMock,
  deleteAllByUserIdMock,
  insertManyMock,
  renderTotpQrCodeDataUriMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  upsertTwoFactorSecretMock: vi.fn(),
  setRequiredFactorsMock: vi.fn(),
  setTwoFactorEnabledMock: vi.fn(),
  deleteAllByUserIdMock: vi.fn(),
  insertManyMock: vi.fn(),
  renderTotpQrCodeDataUriMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: getSessionMock, verifyPassword: verifyPasswordMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/mfa/drizzle-user-security-repository", () => ({
  DrizzleUserSecurityRepository: class {
    findByUserId = findByUserIdMock;
    upsertTwoFactorSecret = upsertTwoFactorSecretMock;
    setRequiredFactors = setRequiredFactorsMock;
    setTwoFactorEnabled = setTwoFactorEnabledMock;
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

function buildRequest(body?: Record<string, unknown>) {
  return new Request("https://devafusion.net/api/auth/two-factor/enrol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? "" : JSON.stringify(body),
  });
}

describe("POST /api/auth/two-factor/enrol", () => {
  afterEach(() => {
    getSessionMock.mockReset();
    verifyPasswordMock.mockReset();
    findByUserIdMock.mockReset();
    upsertTwoFactorSecretMock.mockReset();
    setRequiredFactorsMock.mockReset();
    setTwoFactorEnabledMock.mockReset();
    deleteAllByUserIdMock.mockReset();
    insertManyMock.mockReset();
    renderTotpQrCodeDataUriMock.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await POST(buildRequest());
    expect(response.status).toBe(401);
  });

  it("returns 400 when re-enrolling an already-enabled account without a password", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true, requiredFactors: ["password", "totp"] });

    const response = await POST(buildRequest());
    expect(response.status).toBe(400);
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  it("returns 401 when re-enrolling with an incorrect password", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true, requiredFactors: ["password", "totp"] });
    verifyPasswordMock.mockRejectedValue(new Error("wrong password"));

    const response = await POST(buildRequest({ password: "wrong" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Incorrect password.");
    expect(upsertTwoFactorSecretMock).not.toHaveBeenCalled();
  });

  it("re-enrols and resets twoFactorEnabled to false when the password is correct", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ twoFactorEnabled: true, requiredFactors: ["password", "totp"] });
    verifyPasswordMock.mockResolvedValue({ status: true });
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    const response = await POST(buildRequest({ password: "correct-horse-battery" }));

    expect(response.status).toBe(200);
    expect(setTwoFactorEnabledMock).toHaveBeenCalledWith("u1", false);
    expect(upsertTwoFactorSecretMock).toHaveBeenCalledWith("u1", expect.any(String));
  });

  it("returns a QR data URI, manual-entry secret, and 8 backup codes on success", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue(undefined);
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(body.qrCodeDataUri).toBe("data:image/png;base64,abc123");
    expect(typeof body.manualEntrySecret).toBe("string");
    expect(body.backupCodes).toHaveLength(8);
  });

  it("upserts the plaintext secret and adds 'totp' to requiredFactors when not already present", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ requiredFactors: ["password"], twoFactorEnabled: false });
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST(buildRequest());

    expect(upsertTwoFactorSecretMock).toHaveBeenCalledWith("u1", expect.any(String));
    expect(setRequiredFactorsMock).toHaveBeenCalledWith("u1", ["password", "totp"]);
  });

  it("does not duplicate 'totp' in requiredFactors if it is already present", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue({ requiredFactors: ["password", "totp"], twoFactorEnabled: false });
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST(buildRequest());

    expect(setRequiredFactorsMock).not.toHaveBeenCalled();
  });

  it("replaces any prior backup codes rather than appending to them", async () => {
    getSessionMock.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" } });
    findByUserIdMock.mockResolvedValue(undefined);
    renderTotpQrCodeDataUriMock.mockResolvedValue("data:image/png;base64,abc123");

    await POST(buildRequest());

    expect(deleteAllByUserIdMock).toHaveBeenCalledWith("u1");
    expect(insertManyMock).toHaveBeenCalledWith("u1", expect.arrayContaining([expect.any(String)]));
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    getSessionMock.mockRejectedValue(new Error("network down"));

    const response = await POST(buildRequest());
    expect(response.status).toBe(500);
  });
});
