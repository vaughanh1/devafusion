import { afterEach, describe, expect, it } from "vitest";

import {
  deleteMfaSession,
  getMfaSession,
  setMfaSession,
} from "../mfa-session-cache";
import type { MfaSessionState } from "../mfa-session-cache";

function buildState(overrides: Partial<MfaSessionState> = {}): MfaSessionState {
  return {
    userId: "u1",
    email: "ada@example.com",
    completedFactors: ["password"],
    remainingFactors: ["totp"],
    pendingSessionCookies: ["session=abc123"],
    timestamp: Date.now(),
    ...overrides,
  };
}

// The module under test is a real, module-level LRUCache singleton
// (not constructor-injected) - every test uses its own unique token
// so state from one test can never leak into another via cache reuse.
describe("mfa-session-cache", () => {
  afterEach(() => {
    deleteMfaSession("test-token-1");
    deleteMfaSession("test-token-2");
  });

  it("returns undefined for a token that was never set", () => {
    expect(getMfaSession("never-set-token")).toBeUndefined();
  });

  it("returns the exact state that was set for a given token", () => {
    const state = buildState();
    setMfaSession("test-token-1", state);

    expect(getMfaSession("test-token-1")).toEqual(state);
  });

  it("deletes a session so it can no longer be retrieved (single-use consumption)", () => {
    setMfaSession("test-token-1", buildState());
    deleteMfaSession("test-token-1");

    expect(getMfaSession("test-token-1")).toBeUndefined();
  });

  it("keeps different tokens' state independent", () => {
    const stateA = buildState({ userId: "userA" });
    const stateB = buildState({ userId: "userB" });

    setMfaSession("test-token-1", stateA);
    setMfaSession("test-token-2", stateB);

    expect(getMfaSession("test-token-1")?.userId).toBe("userA");
    expect(getMfaSession("test-token-2")?.userId).toBe("userB");
  });

  it("overwrites a token's state when set again with the same token (factor chaining)", () => {
    setMfaSession("test-token-1", buildState({ remainingFactors: ["totp", "email"] }));
    setMfaSession(
      "test-token-1",
      buildState({ completedFactors: ["password", "totp"], remainingFactors: ["email"] }),
    );

    expect(getMfaSession("test-token-1")?.remainingFactors).toEqual(["email"]);
  });

  it("deleting an already-deleted token is a no-op, not an error", () => {
    expect(() => deleteMfaSession("never-set-token")).not.toThrow();
  });
});
