import { describe, expect, it } from "vitest";

import { emailOtpBody, emailOtpSubject } from "../email-otp-content";

describe("email-otp-content", () => {
  it("returns a non-empty subject", () => {
    expect(emailOtpSubject().length).toBeGreaterThan(0);
  });

  it("interpolates the accessible code into the body", () => {
    const body = emailOtpBody("1 2 3 4 5 6");
    expect(body).toContain("1 2 3 4 5 6");
  });

  it("mentions the 3-minute expiry", () => {
    expect(emailOtpBody("1 2 3 4 5 6")).toContain("3 minutes");
  });
});
