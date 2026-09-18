// Centralised, non-hardcoded copy for the account email-verification
// message - same rationale as mfa/email-otp-content.ts's own comment
// (no i18n library installed today; centralising here is the
// dependency-free step that makes adopting one later a mechanical
// change to this one file).
export function emailVerificationSubject(): string {
  return "Verify your email address";
}

export function emailVerificationBody(verificationUrl: string): string {
  return `Click the link below to verify your email address:\n\n${verificationUrl}\n\nThis link expires in 1 hour. If you did not create an account, you can safely ignore this email.`;
}
