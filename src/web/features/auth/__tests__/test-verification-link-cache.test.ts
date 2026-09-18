import { afterEach, describe, expect, it } from "vitest";

import {
  captureTestVerificationLink,
  consumeTestVerificationLink,
  isTestVerificationCaptureEnabled,
} from "@/features/auth/test-verification-link-cache";

describe("test-verification-link-cache", () => {
  afterEach(() => {
    delete process.env.TEST_DB_ACTIONS;
    delete process.env.TEST_MFA_FLOWS;
  });

  it("isTestVerificationCaptureEnabled is false when neither flag is set", () => {
    expect(isTestVerificationCaptureEnabled()).toBe(false);
  });

  it("isTestVerificationCaptureEnabled is true when TEST_DB_ACTIONS is 'true'", () => {
    process.env.TEST_DB_ACTIONS = "true";
    expect(isTestVerificationCaptureEnabled()).toBe(true);
  });

  it("isTestVerificationCaptureEnabled is true when TEST_MFA_FLOWS is 'true'", () => {
    process.env.TEST_MFA_FLOWS = "true";
    expect(isTestVerificationCaptureEnabled()).toBe(true);
  });

  it("captures and consumes a link for a given email, case-insensitively", () => {
    captureTestVerificationLink("Ada@Example.com", "https://example.com/verify?token=1");

    expect(consumeTestVerificationLink("ada@example.com")).toBe(
      "https://example.com/verify?token=1",
    );
  });

  it("returns undefined once a link has been consumed (one-time read)", () => {
    captureTestVerificationLink("ada@example.com", "https://example.com/verify?token=1");
    consumeTestVerificationLink("ada@example.com");

    expect(consumeTestVerificationLink("ada@example.com")).toBeUndefined();
  });

  it("returns undefined for an email with no captured link", () => {
    expect(consumeTestVerificationLink("unknown@example.com")).toBeUndefined();
  });
});
