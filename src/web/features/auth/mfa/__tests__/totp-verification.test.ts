import * as OTPAuth from "otpauth";
import { describe, expect, it } from "vitest";

// Proves the actual otpauth library behaviour this project's verify
// route (app/api/auth/two-factor/verify/route.ts) depends on - a real
// generate/validate round-trip, not a mocked assertion, mirroring the
// "prove it against something real" posture already established for
// the PGlite repository suite and the local Docker Postgres migration
// workflow this session.
describe("TOTP generate/validate (otpauth)", () => {
  it("validates a freshly generated code as an exact match (delta 0)", () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ secret });

    const code = totp.generate();
    expect(code).toMatch(/^\d{6}$/);

    const delta = totp.validate({ token: code, window: 1 });
    expect(delta).toBe(0);
  });

  it("rejects an incorrect code", () => {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({ secret });

    const delta = totp.validate({ token: "000000", window: 1 });
    expect(delta).toBeNull();
  });

  it("rejects a code generated from a different secret", () => {
    const secretA = new OTPAuth.Secret({ size: 20 });
    const secretB = new OTPAuth.Secret({ size: 20 });
    const totpA = new OTPAuth.TOTP({ secret: secretA });
    const totpB = new OTPAuth.TOTP({ secret: secretB });

    const codeFromA = totpA.generate();
    const delta = totpB.validate({ token: codeFromA, window: 1 });
    expect(delta).toBeNull();
  });

  it("round-trips a base32-encoded secret through Secret.fromBase32", () => {
    const original = new OTPAuth.Secret({ size: 20 });
    const restored = OTPAuth.Secret.fromBase32(original.base32);

    const totpOriginal = new OTPAuth.TOTP({ secret: original });
    const totpRestored = new OTPAuth.TOTP({ secret: restored });

    const code = totpOriginal.generate();
    expect(totpRestored.validate({ token: code, window: 1 })).toBe(0);
  });
});
