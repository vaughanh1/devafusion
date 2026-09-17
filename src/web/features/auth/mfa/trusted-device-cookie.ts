// Single source of truth for the trusted-device cookie's name and
// lifetime - shared by login-step1 (reads it), two-factor/verify
// (sets it), auth.ts's delete-user after-hook (expires it), and
// mfa-deletion-handler.ts's own comment referencing it. UK PECR: the
// cookie value is always a high-entropy, server-generated opaque
// lookup token (see db/schema.ts's trustedDevices table), never a
// client hardware/fingerprint signal.
export const TRUSTED_DEVICE_COOKIE_NAME = "devafusion-trusted-device";

// Absolute 30-day ceiling, matching mfa_frequency's '30_days' option
// (db/schema.ts) - a trusted device is never trusted indefinitely.
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
