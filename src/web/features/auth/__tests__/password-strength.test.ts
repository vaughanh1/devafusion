import { describe, expect, it } from "vitest";

import {
  isPasswordStrongEnough,
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES_ATTRIBUTE,
  PASSWORD_STRENGTH_RULES,
} from "@/features/auth/password-strength";

// ADR-0014: enforced identically client-side (sign-up-form.tsx,
// reset-password-form.tsx, via PasswordStrengthMeter) and server-side
// (auth.ts's hooks.before) - this pure-function core is the single
// source of truth for both, so it is the one place that needs direct
// coverage of every rule's edge cases.
describe("isPasswordStrongEnough", () => {
  it("rejects a password shorter than the minimum length", () => {
    expect(isPasswordStrongEnough("Aa1!aa")).toBe(false);
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(isPasswordStrongEnough("lowercase1!")).toBe(false);
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(isPasswordStrongEnough("UPPERCASE1!")).toBe(false);
  });

  it("rejects a password missing a number", () => {
    expect(isPasswordStrongEnough("NoNumbers!")).toBe(false);
  });

  it("rejects a password missing a special character", () => {
    expect(isPasswordStrongEnough("NoSpecial1")).toBe(false);
  });

  it("accepts a password meeting every rule", () => {
    expect(isPasswordStrongEnough("Correct-Horse-9!")).toBe(true);
  });

  it("MIN_PASSWORD_LENGTH matches the length rule's own threshold", () => {
    // Both candidates already contain an uppercase, lowercase, number
    // and special character - only their total length differs, so
    // this isolates the length rule specifically.
    const oneCharTooShort = "A".repeat(MIN_PASSWORD_LENGTH - 4) + "a1!";
    expect(oneCharTooShort).toHaveLength(MIN_PASSWORD_LENGTH - 1);
    expect(isPasswordStrongEnough(oneCharTooShort)).toBe(false);

    const exactlyLongEnough = "A".repeat(MIN_PASSWORD_LENGTH - 3) + "a1!";
    expect(exactlyLongEnough).toHaveLength(MIN_PASSWORD_LENGTH);
    expect(isPasswordStrongEnough(exactlyLongEnough)).toBe(true);
  });

  it("exposes exactly one rule per requirement, each independently testable", () => {
    expect(PASSWORD_STRENGTH_RULES.map((rule) => rule.id)).toEqual([
      "length",
      "uppercase",
      "lowercase",
      "number",
      "special",
    ]);
  });
});

// ADR-0014: without this attribute, Chrome's/Safari's default
// password-generation rule permits but never requires special
// characters (Apple's own documented default), which can silently
// produce a generated password this app's own server-side check then
// rejects. Confirmed against Apple's official passwordrules spec that
// "required: <class>" is the correct keyword for a class that MUST
// appear, and that minlength is a distinct, separately-specified key.
describe("PASSWORD_RULES_ATTRIBUTE", () => {
  it("requires every character class this app's own rule enforces", () => {
    expect(PASSWORD_RULES_ATTRIBUTE).toContain("required: upper");
    expect(PASSWORD_RULES_ATTRIBUTE).toContain("required: lower");
    expect(PASSWORD_RULES_ATTRIBUTE).toContain("required: digit");
    expect(PASSWORD_RULES_ATTRIBUTE).toContain("required: special");
  });

  it("states the same minimum length as MIN_PASSWORD_LENGTH", () => {
    expect(PASSWORD_RULES_ATTRIBUTE).toContain(`minlength: ${MIN_PASSWORD_LENGTH}`);
  });
});
