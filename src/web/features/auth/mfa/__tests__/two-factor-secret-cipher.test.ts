import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
} from "../two-factor-secret-cipher";

// Generated fresh at test-run time (never a committed literal) so this
// suite never depends on a real MFA_ENCRYPTION_KEY being set, and so a
// gitleaks-shaped high-entropy base64 string never sits in git history
// even as an obvious throwaway (root AGENTS.md Zero Hardcoded Secrets,
// Automated Secret Scanning).
const TEST_KEY = randomBytes(32).toString("base64");

describe("two-factor-secret-cipher", () => {
  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = TEST_KEY;
  });

  it("round-trips a plaintext secret through encrypt and decrypt", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptTwoFactorSecret(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(decryptTwoFactorSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const first = encryptTwoFactorSecret(plaintext);
    const second = encryptTwoFactorSecret(plaintext);

    expect(first).not.toBe(second);
    expect(decryptTwoFactorSecret(first)).toBe(plaintext);
    expect(decryptTwoFactorSecret(second)).toBe(plaintext);
  });

  it("throws instead of decrypting when the ciphertext has been tampered with", () => {
    const encrypted = encryptTwoFactorSecret("JBSWY3DPEHPK3PXP");
    const [iv, authTag, ciphertext] = encrypted.split(".");

    // Flip one byte in the middle of the ciphertext - GCM's auth tag
    // must then fail to verify, proving tampering is actually detected
    // rather than silently decrypting to corrupted plaintext.
    const ciphertextBytes = Buffer.from(ciphertext!, "base64");
    ciphertextBytes[Math.floor(ciphertextBytes.length / 2)] ^= 0xff;
    const tampered = [iv, authTag, ciphertextBytes.toString("base64")].join(
      ".",
    );

    expect(() => decryptTwoFactorSecret(tampered)).toThrow();
  });

  it("throws when MFA_ENCRYPTION_KEY is not set", () => {
    delete process.env.MFA_ENCRYPTION_KEY;

    expect(() => encryptTwoFactorSecret("JBSWY3DPEHPK3PXP")).toThrow(
      /MFA_ENCRYPTION_KEY is not set/,
    );
  });

  it("throws when MFA_ENCRYPTION_KEY does not decode to 32 bytes", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.from("too-short").toString(
      "base64",
    );

    expect(() => encryptTwoFactorSecret("JBSWY3DPEHPK3PXP")).toThrow(
      /must decode to exactly 32 bytes/,
    );
  });
});
