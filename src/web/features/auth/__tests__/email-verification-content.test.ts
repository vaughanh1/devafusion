import { describe, expect, it } from "vitest";

import {
  emailVerificationBody,
  emailVerificationSubject,
} from "@/features/auth/email-verification-content";

describe("email-verification-content", () => {
  it("returns a non-empty subject", () => {
    expect(emailVerificationSubject().length).toBeGreaterThan(0);
  });

  it("interpolates the verification url into the body", () => {
    const body = emailVerificationBody("https://example.com/verify?token=abc");
    expect(body).toContain("https://example.com/verify?token=abc");
  });

  // Matches emailAndPassword's/emailVerification's default expiresIn
  // (1 hour, unset in auth.ts) - see the engineering log entry that
  // added this disclosure after checking GDPR compliance.
  it("mentions the 1-hour expiry", () => {
    expect(emailVerificationBody("https://example.com/verify")).toContain(
      "1 hour",
    );
  });
});
