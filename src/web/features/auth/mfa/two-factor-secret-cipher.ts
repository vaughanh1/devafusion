import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

// Application-layer envelope encryption for the TOTP seed stored in
// user_security.two_factor_secret (docs/adr/0012). Postgres itself never
// holds a recoverable plaintext secret - only this module ever sees the
// raw TOTP seed. AES-256-GCM: authenticated encryption, so a tampered
// ciphertext fails decryption loudly (auth tag mismatch) rather than
// silently returning corrupted data.
//
// MFA_ENCRYPTION_KEY is a Key Vault secret value, wired into the App
// Service's app_settings by Terraform exactly like DATABASE_URL's
// password component (root AGENTS.md Zero Hardcoded Secrets, ADR-0004)
// - never a literal here, never logged, never included in an error
// message.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // NIST-recommended IV length for GCM.
const AUTH_TAG_LENGTH_BYTES = 16;

function loadKey(): Buffer {
  const base64Key = process.env.MFA_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is not set - cannot encrypt or decrypt two_factor_secret.",
    );
  }

  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error(
      "MFA_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM.",
    );
  }

  return key;
}

// Stored format: base64(iv) + "." + base64(authTag) + "." +
// base64(ciphertext) - a single text column value, self-describing so
// no separate columns are needed for the IV/tag.
export function encryptTwoFactorSecret(plaintextSecret: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintextSecret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptTwoFactorSecret(storedValue: string): string {
  const [ivB64, authTagB64, ciphertextB64] = storedValue.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error(
      "Stored two_factor_secret value is not in the expected iv.authTag.ciphertext format.",
    );
  }

  const key = loadKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error("Stored two_factor_secret auth tag has an unexpected length.");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
