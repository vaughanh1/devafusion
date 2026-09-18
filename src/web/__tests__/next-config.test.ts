import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../next.config";

// Direct unit test for next.config.ts's headers() function - the
// only place this project's Content-Security-Policy is defined.
// Exists because a real regression was found and fixed here: dev
// mode's own browser console logged "eval() is not supported in
// this environment" on every page load, since script-src had no
// 'unsafe-eval' and Next.js/React's dev-mode Fast Refresh tooling
// genuinely calls eval(). Asserts both branches explicitly so a
// future change can't silently widen production's CSP while fixing
// a dev-only problem, or vice versa. vi.stubEnv is required rather
// than a direct process.env.NODE_ENV assignment - NODE_ENV is typed
// read-only by this project's TypeScript/Node version.
describe("next.config.ts headers()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function getCsp(): Promise<string> {
    const result = await nextConfig.headers?.();
    const entry = result?.find((item) => item.source === "/:path*");
    const header = entry?.headers.find(
      (candidate) => candidate.key === "Content-Security-Policy",
    );
    if (!header) {
      throw new Error("Content-Security-Policy header not found in next.config.ts");
    }
    return header.value;
  }

  it("includes 'unsafe-eval' in script-src during development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const csp = await getCsp();
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it("never includes 'unsafe-eval' in script-src in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const csp = await getCsp();
    expect(csp).not.toMatch(/'unsafe-eval'/);
  });

  it("always keeps the Turnstile and GA4 origins present in both environments", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const prodCsp = await getCsp();
    vi.stubEnv("NODE_ENV", "development");
    const devCsp = await getCsp();

    for (const csp of [prodCsp, devCsp]) {
      expect(csp).toContain("https://challenges.cloudflare.com");
      expect(csp).toContain("https://www.googletagmanager.com");
      expect(csp).toContain("https://*.google-analytics.com");
    }
  });
});
