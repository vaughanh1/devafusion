import { describe, expect, it } from "vitest";

import {
  emailResetPasswordBody,
  emailResetPasswordSubject,
} from "@/features/auth/email-reset-password-content";

describe("email-reset-password-content", () => {
  it("returns a non-empty subject", () => {
    expect(emailResetPasswordSubject().length).toBeGreaterThan(0);
  });

  it("interpolates the reset url into the body", () => {
    const body = emailResetPasswordBody("https://example.com/reset?token=abc");
    expect(body).toContain("https://example.com/reset?token=abc");
  });

  // Matches emailAndPassword.resetPasswordTokenExpiresIn's default
  // (1 hour, unset in auth.ts) - see the engineering log entry that
  // added this disclosure after checking GDPR compliance.
  it("mentions the 1-hour expiry", () => {
    expect(emailResetPasswordBody("https://example.com/reset")).toContain(
      "1 hour",
    );
  });
});
