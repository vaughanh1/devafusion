// Deliberately NO "server-only" guard here: db/schema.ts imports this
// module directly (via the encryptedSecretText customType below being
// defined there), and db/schema.ts itself cannot carry "server-only" -
// drizzle-kit's CLI (generate/migrate) requires db/schema.ts through
// plain Node, outside Next.js's bundler, so it never resolves the
// "react-server" export condition and would hit server-only's hard
// throw unconditionally (see db/schema.ts's own top-of-file comment,
// proven by actually running `drizzle-kit generate`). The real
// client-bundle leak risk this project's server-only convention
// guards against does not apply here either: this module never
// touches a Zod schema or any client-importable surface, only Node's
// native crypto module.
//
// Supersedes the former features/auth/mfa/two-factor-secret-cipher.ts
// (removed in this slice) - that module required every caller to
// remember to call encryptTwoFactorSecret/decryptTwoFactorSecret by
// convention; this module is instead only ever invoked by the
// encryptedSecretText customType in db/schema.ts, so the encryption
// boundary is structural rather than convention-dependent. Same
// AES-256-GCM primitive and the same MFA_ENCRYPTION_KEY Key Vault
// secret as before, but the stored format is now
// ivHex:authTagHex:ciphertextHex (colon-delimited hex) rather than the
// old dot-delimited-base64 format, per this slice's requested
// customType contract.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // NIST-recommended IV length for GCM.
const AUTH_TAG_LENGTH_BYTES = 16;

function loadEncryptedColumnKey(): Buffer {
  const base64Key = process.env.MFA_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error(
      "MFA_ENCRYPTION_KEY is not set - cannot encrypt or decrypt an encryptedSecretText column value.",
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

// Stored format: ivHex:authTagHex:ciphertextHex - a single self-
// describing text column value, no separate IV/tag columns needed.
export function encryptColumnValue(plaintext: string): string {
  const key = loadEncryptedColumnKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    ciphertext.toString("hex"),
  ].join(":");
}

export function decryptColumnValue(storedValue: string): string {
  const [ivHex, authTagHex, ciphertextHex] = storedValue.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error(
      "Stored encryptedSecretText value is not in the expected ivHex:authTagHex:ciphertextHex format.",
    );
  }

  const key = loadEncryptedColumnKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error(
      "Stored encryptedSecretText value's auth tag has an unexpected length.",
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
