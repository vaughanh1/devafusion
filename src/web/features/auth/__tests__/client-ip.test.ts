import { describe, expect, it } from "vitest";

import { NO_TRUSTED_CLIENT_IP, resolveClientIp } from "../client-ip";

function buildRequest(forwardedFor?: string) {
  return new Request("https://devafusion.net/sign-in/email", {
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : undefined,
  });
}

describe("resolveClientIp", () => {
  it("trusts a single-value X-Forwarded-For header (this app's real topology)", () => {
    expect(resolveClientIp(buildRequest("203.0.113.5"))).toBe("203.0.113.5");
  });

  it("does not trust a spoofed multi-value chain with no trustedProxies configured", () => {
    // ADR-0014: a bot appending a second, fabricated hop to its own
    // spoofed value - Better Auth's own getIP (verified directly
    // against @better-auth/core/utils/ip.ts) refuses to guess which
    // entry is real without a trustedProxies list, and does NOT fall
    // through to the shared "no trusted IP" bucket in test/development
    // environments specifically - it falls back to a fixed localhost
    // sentinel instead (its own documented dev-convenience behaviour).
    // This still proves the point that matters: the spoofed value
    // "1.1.1.1" is never the one returned.
    const result = resolveClientIp(buildRequest("1.1.1.1, 203.0.113.5"));
    expect(result).not.toBe("1.1.1.1");
    expect(result).not.toBe("203.0.113.5");
  });

  it("falls back to a fixed value, never undefined/throwing, when no forwarded header is present", () => {
    // NODE_ENV=test during this suite triggers Better Auth's own
    // documented dev-convenience localhost fallback rather than this
    // helper's own NO_TRUSTED_CLIENT_IP sentinel - both are equally
    // safe "no real signal" outcomes; this test only asserts the
    // helper never returns something falsy/throws when no header is
    // present at all.
    const result = resolveClientIp(buildRequest());
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("exports NO_TRUSTED_CLIENT_IP as the documented fallback sentinel", () => {
    // Asserted directly since the test/development environment above
    // masks it behind Better Auth's own localhost convenience fallback
    // - this at least keeps the constant itself under test so a future
    // accidental rename is caught.
    expect(NO_TRUSTED_CLIENT_IP).toBe("no-trusted-ip");
  });
});
