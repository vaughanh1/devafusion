import { describe, expect, it } from "vitest";

import { formatOtpForAccessibility } from "../format-otp-for-accessibility";

// Screen readers and text-to-speech engines read a spaced digit run
// ("1 2 3 4 5 6") as six discrete characters, not a single large
// number - this is the actual accessibility requirement being
// tested, not just a formatting preference.
describe("formatOtpForAccessibility", () => {
  it("inserts a space between every digit of a 6-digit code", () => {
    expect(formatOtpForAccessibility("123456")).toBe("1 2 3 4 5 6");
  });

  it("does not group digits (e.g. never '123 456')", () => {
    const result = formatOtpForAccessibility("123456");
    expect(result).not.toContain("123 456");
    expect(result.split(" ")).toHaveLength(6);
  });

  it("handles a code with repeated digits correctly", () => {
    expect(formatOtpForAccessibility("111111")).toBe("1 1 1 1 1 1");
  });

  it("never uses commas as the separator (a comma is a pause marker to screen readers/TTS, not a hard digit boundary)", () => {
    expect(formatOtpForAccessibility("123456")).not.toContain(",");
  });
});
