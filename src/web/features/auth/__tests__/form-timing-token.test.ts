import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFormTimingToken,
  verifyFormTimingToken,
} from "../form-timing-token";

// Generated fresh at test-run time, never a committed literal - same
// rationale as two-factor-secret-cipher.test.ts's TEST_KEY.
const TEST_SECRET = randomBytes(32).toString("base64");

describe("form-timing-token", () => {
  beforeEach(() => {
    process.env.FORM_TIMING_TOKEN_SECRET = TEST_SECRET;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a token submitted immediately (too fast for a human)", () => {
    const token = createFormTimingToken();

    expect(verifyFormTimingToken(token)).toEqual({
      valid: false,
      reason: "too-fast",
    });
  });

  it("accepts a token after the minimum elapsed time has passed", () => {
    const token = createFormTimingToken();
    vi.advanceTimersByTime(1500);

    expect(verifyFormTimingToken(token)).toEqual({ valid: true });
  });

  it("rejects a stale token older than the maximum window", () => {
    const token = createFormTimingToken();
    vi.advanceTimersByTime(31 * 60 * 1000);

    expect(verifyFormTimingToken(token)).toEqual({
      valid: false,
      reason: "expired",
    });
  });

  it("rejects a tampered signature", () => {
    const token = createFormTimingToken();
    vi.advanceTimersByTime(1500);
    const [renderedAtMs] = token.split(".");
    const tampered = `${renderedAtMs}.not-the-real-signature`;

    expect(verifyFormTimingToken(tampered)).toEqual({
      valid: false,
      reason: "signature-mismatch",
    });
  });

  it("rejects a malformed token", () => {
    expect(verifyFormTimingToken("not-a-real-token")).toEqual({
      valid: false,
      reason: "malformed",
    });
    expect(verifyFormTimingToken(undefined)).toEqual({
      valid: false,
      reason: "malformed",
    });
    expect(verifyFormTimingToken(42)).toEqual({
      valid: false,
      reason: "malformed",
    });
  });

  it("throws when FORM_TIMING_TOKEN_SECRET is not set", () => {
    delete process.env.FORM_TIMING_TOKEN_SECRET;

    expect(() => createFormTimingToken()).toThrow(
      /FORM_TIMING_TOKEN_SECRET is not set/,
    );
  });
});
