import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  turbopack: {
    root: process.cwd(),
  },

  // ADR-0014: minimal CSP, scoped only to what Cloudflare Turnstile's
  // widget needs (its own documented CSP reference: script-src and
  // frame-src must allow challenges.cloudflare.com) - deliberately not
  // a full site-wide CSP hardening pass, which would need to audit
  // every existing third-party script (GA4 via @next/third-parties,
  // etc.) as its own, larger, separately-scoped effort.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            // Deliberately narrow, not a full CSP hardening pass:
            // - No default-src - would fall back to blocking every
            //   directive not explicitly enumerated here.
            // - script-src must keep 'unsafe-inline': this app has two
            //   real inline scripts today - the Organization JSON-LD
            //   (components/seo/organization-schema.tsx) and the
            //   pre-hydration accessibility theme flash-prevention
            //   script (components/theme/theme-flash-guard.tsx,
            //   src/web/AGENTS.md's Accessibility Theme Engine
            //   section). Dropping 'unsafe-inline' without switching
            //   both to a nonce-based CSP would silently break the
            //   flash-prevention script (a real, visible regression -
            //   the theme flash it exists to prevent would return) and
            //   is a separate, larger effort than adding Turnstile's
            //   own script-src/frame-src entries.
            // - googletagmanager.com/google-analytics.com are already-
            //   present third-party script/beacon origins
            //   (components/analytics/google-analytics.tsx's
            //   @next/third-parties GoogleAnalytics component) that
            //   this CSP must not silently break - carried forward
            //   unchanged, not newly introduced by this change.
            //   *.google-analytics.com (a CSP wildcard, matches any
            //   subdomain) is required, not just www.google-
            //   analytics.com: GA4's gtag.js sends its actual collect
            //   beacon to a region-prefixed subdomain
            //   (region1.google-analytics.com, etc., confirmed by a
            //   real browser console CSP violation against the
            //   www.-only version originally shipped here) rather than
            //   the bare www host.
            value: [
              "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com",
              "frame-src 'self' https://challenges.cloudflare.com",
              "connect-src 'self' https://challenges.cloudflare.com https://*.google-analytics.com https://www.googletagmanager.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "devafusion.com",
          },
        ],
        destination: "https://devafusion.net/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "devafusion.co.uk",
          },
        ],
        destination: "https://devafusion.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
