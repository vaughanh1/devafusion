// Centralised, non-hardcoded copy for the password-reset email -
// same rationale as email-verification-content.ts's own comment.
export function emailResetPasswordSubject(): string {
  return "Reset your password";
}

export function emailResetPasswordBody(resetUrl: string): string {
  return `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.`;
}
