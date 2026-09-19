import { describe, expect, it } from "vitest";

import { isAlwaysAllowedPath, isMfaSetupComplete } from "../mfa-setup-required";

describe("isAlwaysAllowedPath", () => {
  it("allows the forced setup page itself and its sub-paths", () => {
    expect(isAlwaysAllowedPath("/mfa-setup")).toBe(true);
    expect(isAlwaysAllowedPath("/mfa-setup/anything")).toBe(true);
  });

  it("allows every API route the setup page depends on", () => {
    expect(isAlwaysAllowedPath("/api/auth/get-session")).toBe(true);
    expect(isAlwaysAllowedPath("/api/user/security/settings")).toBe(true);
  });

  it("allows pre-session auth pages", () => {
    expect(isAlwaysAllowedPath("/log-in")).toBe(true);
    expect(isAlwaysAllowedPath("/sign-up")).toBe(true);
    expect(isAlwaysAllowedPath("/forget-password")).toBe(true);
    expect(isAlwaysAllowedPath("/reset-password")).toBe(true);
    expect(isAlwaysAllowedPath("/legal")).toBe(true);
  });

  it("does not allow an ordinary page", () => {
    expect(isAlwaysAllowedPath("/account")).toBe(false);
    expect(isAlwaysAllowedPath("/")).toBe(false);
  });

  // A prefix match must respect path boundaries - "/log-india" must
  // not be treated as allowed just because it starts with the same
  // characters as "/log-in".
  it("does not false-positive on a path that merely starts with the same characters", () => {
    expect(isAlwaysAllowedPath("/log-india")).toBe(false);
    expect(isAlwaysAllowedPath("/sign-uppercase")).toBe(false);
  });
});

describe("isMfaSetupComplete", () => {
  it("is false when no user_security row exists at all", () => {
    expect(isMfaSetupComplete(undefined)).toBe(false);
  });

  it("is false for an unconfirmed TOTP enrolment (row exists, but twoFactorEnabled is still false)", () => {
    expect(
      isMfaSetupComplete({ requiredFactors: ["password", "totp"], twoFactorEnabled: false }),
    ).toBe(false);
  });

  it("is true once TOTP has actually been confirmed", () => {
    expect(
      isMfaSetupComplete({ requiredFactors: ["password", "totp"], twoFactorEnabled: true }),
    ).toBe(true);
  });

  it("is true for Email OTP with no confirmation step required", () => {
    expect(
      isMfaSetupComplete({ requiredFactors: ["password", "email"], twoFactorEnabled: false }),
    ).toBe(true);
  });

  it("is true for a deliberately saved password-only policy", () => {
    expect(
      isMfaSetupComplete({ requiredFactors: ["password"], twoFactorEnabled: false }),
    ).toBe(true);
  });
});
