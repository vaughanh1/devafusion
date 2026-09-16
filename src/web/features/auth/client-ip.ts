import "server-only";

import { getIP } from "@better-auth/core/utils/ip";

// Single source of truth for resolving the real client IP, shared by
// Better Auth's own rate limiter (via auth.ts's advanced.ipAddress
// config) and this project's own self-built limiter for routes outside
// Better Auth's router (docs/adr/0014) - e.g.
// /api/auth/two-factor/verify, /api/account/export,
// /api/account/delete. Both must resolve the identical address for the
// same request, or a request could be throttled under one identity by
// one limiter and a different identity by the other.
//
// Deliberately reuses @better-auth/core/utils/ip's own getIP rather
// than re-implementing X-Forwarded-For parsing here: it is a public,
// documented export (see its package.json's "./utils/*" entry), and
// re-deriving the same spoof-resistant chain-walking logic in a second
// place would be exactly the kind of drift this shared-helper file
// exists to prevent. See auth.ts's advanced.ipAddress comment for why
// trustedProxies is left unset (Azure App Service's multitenant
// front-end has no small, stable CIDR list to trust) and why this
// alone does not stop a single spoofed X-Forwarded-For value - that
// gap is covered by Turnstile and the timing heuristic, not by IP
// resolution.
const IP_ADDRESS_HEADERS = ["x-forwarded-for"];

// A resolved client IP, or the literal string below when none could be
// trustworthy resolved (e.g. a multi-hop X-Forwarded-For chain with no
// trustedProxies configured - Better Auth's own getIP returns null in
// exactly this case rather than guessing). Every caller must bucket
// this value the same way Better Auth's own rate limiter does, so an
// unresolvable request is never silently exempted from either limiter.
export const NO_TRUSTED_CLIENT_IP = "no-trusted-ip";

// Note: @better-auth/core/utils/ip's getIP has its own documented dev-
// convenience fallback - in a NODE_ENV=test or =development process it
// returns a fixed localhost sentinel instead of null when no
// trustworthy IP can be resolved, so NO_TRUSTED_CLIENT_IP below is
// only actually reached in production (Azure App Service's Node.js
// runtime sets NODE_ENV=production by default) or on an explicit
// multi-hop-with-no-trustedProxies case in production. Verified
// directly by running this module's own test suite, which observes
// Better Auth's localhost fallback rather than this sentinel under
// Vitest's NODE_ENV=test.
export function resolveClientIp(request: Request): string {
  const ip = getIP(request, {
    advanced: { ipAddress: { ipAddressHeaders: IP_ADDRESS_HEADERS } },
  });

  return ip ?? NO_TRUSTED_CLIENT_IP;
}
