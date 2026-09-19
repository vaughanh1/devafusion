import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-encryption-key-length-incident",
  date: "2026-09-18",
  title: "Live MFA_ENCRYPTION_KEY was 24 bytes, not 32 - rotated after a real 500 on TOTP enrolment",
  summary:
    "A real account hit a 500 clicking 'Set up authenticator app' in production. Traced to the live App Service's MFA_ENCRYPTION_KEY decoding to 24 bytes instead of the required 32 (AES-256-GCM) - encrypted-column-cipher.ts's loadEncryptedColumnKey() throws hard on any length mismatch, caught by the enrol route's try/catch and surfaced only as a generic 500, invisible server-side since App Service fileSystem logging is Off and Application Insights does not yet support the Node 24 LTS runtime this app is pinned to.",
  tags: ["security", "azure", "typescript"],
  decisions: [
    "Ruled out a data-corruption or app-code cause first: queried the live database directly and found zero user_security rows and zero backup_codes rows for the affected account - nothing to corrupt. Reproduced the exact sign-up -> verify -> enrol flow locally against real Docker Postgres with TEST_DB_ACTIONS=true and it succeeded cleanly, isolating the difference to the live environment's own configuration rather than the code.",
    "Fetched the live MFA_ENCRYPTION_KEY value via az webapp config appsettings list and decoded it locally (Buffer.from(key, 'base64').length) rather than assuming - confirmed 24 bytes, not 32. This is the same class of provisioning mistake root AGENTS.md's own history already flags once before (a 34-byte key caught locally pre-deployment) recurring with a different wrong length that reached production undetected.",
    "Rotated by updating BOTH the Key Vault secret (mfa-encryption-key-devafusion) and the live App Service's MFA_ENCRYPTION_KEY app setting to the same freshly generated 32-byte value (openssl-equivalent via node crypto.randomBytes(32)), not just one - web.tf's MFA_ENCRYPTION_KEY reads data.azurerm_key_vault_secret.mfa_encryption_key.value at apply time (ADR-0004's read-only pattern), so updating only the App Service setting would have left it silently reverted back to the old, still-wrong value on the next terraform apply.",
    "Verified the new value's actual decoded length against the live App Service's own reported setting after restart (not just the Key Vault write), and confirmed /api/health returns ok post-restart, before considering the rotation complete.",
    "No orphaned ciphertext to worry about: the same zero-user_security-rows check above confirms no existing two_factor_secret depended on the old key, so this was a clean rotation with no re-enrolment burden on any real user.",
  ],
  milestones: [
    "Key Vault secret mfa-encryption-key-devafusion (kv-devafusion-dev-uks) rotated to a new, correctly-sized 32-byte base64 value.",
    "Live App Service devafusion-dev's MFA_ENCRYPTION_KEY app setting updated to match, followed by an explicit restart.",
  ],
  validation: [
    "Confirmed via az webapp config appsettings list + local base64 decode that the live MFA_ENCRYPTION_KEY now decodes to exactly 32 bytes.",
    "GET https://devafusion.net/api/health returns { status: \"ok\" } after the restart.",
    "Local reproduction of sign-up -> email verification -> TOTP enrolment against real Docker Postgres (TEST_DB_ACTIONS=true) succeeded end-to-end both before and after this change, confirming the application code itself was never the defect.",
  ],
  visibility: "public",
};
