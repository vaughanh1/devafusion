import { describe, expect, it } from "vitest";

import {
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from "../backup-code-hash";

describe("backup-code-hash", () => {
  describe("hashBackupCode / verifyBackupCode", () => {
    it("verifies a code against its own hash", () => {
      const hash = hashBackupCode("AAAA1111BBBB");
      expect(verifyBackupCode("AAAA1111BBBB", hash)).toBe(true);
    });

    it("rejects a different code against a stored hash", () => {
      const hash = hashBackupCode("AAAA1111BBBB");
      expect(verifyBackupCode("WRONGCODE123", hash)).toBe(false);
    });

    it("produces a different hash each time (random salt)", () => {
      const first = hashBackupCode("AAAA1111BBBB");
      const second = hashBackupCode("AAAA1111BBBB");

      expect(first).not.toBe(second);
      expect(verifyBackupCode("AAAA1111BBBB", first)).toBe(true);
      expect(verifyBackupCode("AAAA1111BBBB", second)).toBe(true);
    });

    it("stores the hash as saltHex:derivedKeyHex", () => {
      const hash = hashBackupCode("AAAA1111BBBB");
      const parts = hash.split(":");

      expect(parts).toHaveLength(2);
      for (const part of parts) {
        expect(part).toMatch(/^[0-9a-f]+$/);
      }
    });

    it("returns false, rather than throwing, for a malformed stored hash", () => {
      expect(verifyBackupCode("AAAA1111BBBB", "not-the-right-format")).toBe(false);
    });
  });

  describe("generateBackupCodes", () => {
    it("generates exactly 8 codes", () => {
      expect(generateBackupCodes()).toHaveLength(8);
    });

    it("generates 12-character codes", () => {
      for (const code of generateBackupCodes()) {
        expect(code).toHaveLength(12);
      }
    });

    it("never generates a 0, O, 1, or I (visually ambiguous characters)", () => {
      // Run several batches - a real amount of generated output gives
      // confidence the alphabet restriction actually holds, not just
      // one lucky draw.
      for (let i = 0; i < 20; i += 1) {
        for (const code of generateBackupCodes()) {
          expect(code).not.toMatch(/[0O1I]/);
        }
      }
    });

    it("generates codes that verify correctly once hashed", () => {
      const [code] = generateBackupCodes();
      const hash = hashBackupCode(code!);
      expect(verifyBackupCode(code!, hash)).toBe(true);
    });
  });
});
