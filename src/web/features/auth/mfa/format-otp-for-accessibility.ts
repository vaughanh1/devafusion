// A bare 6-digit run ("123456") is read by most screen readers as a
// single large number ("one hundred twenty-three thousand, four
// hundred fifty-six") rather than six discrete digits, and is
// awkward for a sighted user to read aloud or type accurately for
// the same reason.
//
// A comma-separated run ("1, 2, 3, 4, 5, 6") is NOT the fix - most
// screen readers and every common "read aloud"/dictation engine
// treat a comma as a clause/pause marker, not a hard digit boundary,
// so "1, 2, 3" can still be run together as "one two three" with
// only a brief pause, and copy-pasting or manually re-typing a
// comma-separated code invites stray "," characters into the input
// field. A plain space is the actual digit separator every screen
// reader (NVDA, JAWS, VoiceOver) and every bank/2FA provider's own
// SMS/voice OTP message uses to force one-digit-at-a-time reading -
// "1 2 3 4 5 6", never "1, 2, 3, 4, 5, 6" and never the bare
// "123456" run. Applied identically to every rendering of the email
// OTP (plain-text email body and any future on-screen display) -
// this is the single source of truth so the two never drift apart.
export function formatOtpForAccessibility(code: string): string {
  return code.split("").join(" ");
}
