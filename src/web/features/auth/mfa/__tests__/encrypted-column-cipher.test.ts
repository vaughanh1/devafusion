import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { decryptColumnValue, encryptColumnValue } from "../encrypted-column-cipher";

// Generated fresh at test-run time (never a committed literal), same
// rationale as the now-removed two-factor-secret-cipher.test.ts this
// module supersedes - never a real MFA_ENCRYPTION_KEY, and never a
// gitleaks-shaped high-entropy string in git history.
const TEST_KEY = randomBytes(32).toString("base64");

describe("encrypted-column-cipher", () => {
  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = TEST_KEY;
  });

  it("round-trips a plaintext value through encrypt and decrypt", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptColumnValue(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(decryptColumnValue(encrypted)).toBe(plaintext);
  });

  it("stores the value as ivHex:authTagHex:ciphertextHex", () => {
    const encrypted = encryptColumnValue("JBSWY3DPEHPK3PXP");
    const parts = encrypted.split(":");

    expect(parts).toHaveLength(3);
    // Every part is valid hex.
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "JBSWY3DPEHPK3PXP";
    const first = encryptColumnValue(plaintext);
    const second = encryptColumnValue(plaintext);

    expect(first).not.toBe(second);
    expect(decryptColumnValue(first)).toBe(plaintext);
    expect(decryptColumnValue(second)).toBe(plaintext);
  });

  it("throws instead of decrypting when the ciphertext has been tampered with", () => {
    const encrypted = encryptColumnValue("JBSWY3DPEHPK3PXP");
    const [iv, authTag, ciphertext] = encrypted.split(":");

    // Flip one hex nibble in the middle of the ciphertext - GCM's
    // auth tag must then fail to verify, proving tampering is
    // actually detected rather than silently decrypting to
    // corrupted plaintext.
    const bytes = Buffer.from(ciphertext!, "hex");
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    const tampered = [iv, authTag, bytes.toString("hex")].join(":");

    expect(() => decryptColumnValue(tampered)).toThrow();
  });

  it("throws when MFA_ENCRYPTION_KEY is not set", () => {
    delete process.env.MFA_ENCRYPTION_KEY;

    expect(() => encryptColumnValue("JBSWY3DPEHPK3PXP")).toThrow(
      /MFA_ENCRYPTION_KEY is not set/,
    );
  });

  it("throws when MFA_ENCRYPTION_KEY does not decode to 32 bytes", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");

    expect(() => encryptColumnValue("JBSWY3DPEHPK3PXP")).toThrow(
      /must decode to exactly 32 bytes/,
    );
  });

  it("throws when decrypting a malformed stored value", () => {
    expect(() => decryptColumnValue("not-the-right-format")).toThrow(
      /not in the expected ivHex:authTagHex:ciphertextHex format/,
    );
  });
});
