// Centralised, non-hardcoded copy for the MFA email-OTP message -
// this project has no i18n library/locale routing today (confirmed:
// no next-intl or equivalent is installed), so this is deliberately
// NOT a full i18n framework adoption (that would be exactly the kind
// of speculative code root AGENTS.md's "No Vibe-Coding" rule warns
// against installing before it's actually needed). Instead, every
// user-facing string used by send-email-otp.ts is centralised here,
// as plain functions taking the values they interpolate, rather than
// inlined into the SDK call - this is the minimal, dependency-free
// step that makes swapping in a real i18n library later
// (parameterising subject()/body() by a locale argument, or
// replacing this file's exports with next-intl's t() calls) a
// mechanical change to one file, not a hunt through send-email-otp.ts
// for hardcoded strings.
export function emailOtpSubject(): string {
  return "Your sign-in verification code";
}

export function emailOtpBody(accessibleCode: string): string {
  return `Your verification code is: ${accessibleCode}\n\nThis code expires in 3 minutes. If you did not request this, you can safely ignore this email.`;
}
