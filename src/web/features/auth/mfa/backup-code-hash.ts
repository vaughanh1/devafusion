import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Backup/recovery codes (UK GDPR Article 32 availability) are hashed,
// never stored reversibly - there is no legitimate reason to ever read
// one back out, only to compare a candidate against its hash. scrypt
// (Node's own built-in, no new dependency) rather than a plain SHA-256
// hash: a backup code has far less entropy than a real cryptographic
// key, so a slow, memory-hard KDF matters here in the same way it
// would for a password, unlike two-factor-secret's TOTP seed (already
// high-entropy, encrypted rather than hashed, and never compared -
// only ever fed back into otpauth).
const SCRYPT_KEY_LENGTH_BYTES = 64;
const SCRYPT_SALT_LENGTH_BYTES = 16;

// Stored format: saltHex:derivedKeyHex - self-describing, matching
// the same "single text column, no separate columns" convention as
// features/auth/mfa/encrypted-column-cipher.ts's ivHex:authTagHex:
// ciphertextHex.
export function hashBackupCode(plaintextCode: string): string {
  const salt = randomBytes(SCRYPT_SALT_LENGTH_BYTES);
  const derivedKey = scryptSync(plaintextCode, salt, SCRYPT_KEY_LENGTH_BYTES);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export function verifyBackupCode(
  plaintextCode: string,
  storedHash: string,
): boolean {
  const [saltHex, derivedKeyHex] = storedHash.split(":");
  if (!saltHex || !derivedKeyHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expectedKey = Buffer.from(derivedKeyHex, "hex");
  const candidateKey = scryptSync(plaintextCode, salt, SCRYPT_KEY_LENGTH_BYTES);

  // Constant-time comparison, same rationale as
  // features/auth/form-timing-token.ts's signature check - a naive
  // === leaks timing information about how many leading bytes matched.
  return (
    candidateKey.length === expectedKey.length &&
    timingSafeEqual(candidateKey, expectedKey)
  );
}

// 8 codes of 12 uppercase-alphanumeric characters each, generated from
// crypto.randomBytes rather than Math.random - these are credential-
// equivalent one-time bypass codes, so they need the same entropy
// source as every other secret in this module.
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity.
const BACKUP_CODE_LENGTH = 12;
const BACKUP_CODE_COUNT = 8;

function generateOneBackupCode(): string {
  const bytes = randomBytes(BACKUP_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < BACKUP_CODE_LENGTH; i += 1) {
    code += BACKUP_CODE_ALPHABET[bytes[i]! % BACKUP_CODE_ALPHABET.length];
  }
  return code;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, generateOneBackupCode);
}
