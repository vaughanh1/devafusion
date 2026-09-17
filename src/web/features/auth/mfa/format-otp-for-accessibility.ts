// A bare 6-digit run ("123456") is read by most screen readers as a
// single large number ("one hundred twenty-three thousand, four
// hundred fifty-six") rather than six discrete digits, and is
// awkward for a sighted user to read aloud or type accurately for
// the same reason. Individually space-separated digits ("1 2 3 4 5
// 6") are read digit-by-digit by every major screen reader (NVDA,
// JAWS, VoiceOver) and are the same convention banks/2FA providers
// use in their own SMS/voice OTP messages. Applied identically to
// every rendering of the email OTP (plain-text email body and any
// future on-screen display) - this is the single source of truth so
// the two never drift apart.
export function formatOtpForAccessibility(code: string): string {
  return code.split("").join(" ");
}
