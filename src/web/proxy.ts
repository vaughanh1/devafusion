import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { isAlwaysAllowedPath, isMfaSetupComplete } from "@/features/auth/mfa/mfa-setup-required";

const userSecurityRepository = new DrizzleUserSecurityRepository();

// UK GDPR Article 25 parity with requireEmailVerification (auth.ts):
// that setting blocks a fresh account from doing anything at all
// until its email is verified - a real session is never even minted.
// login-step1's own withheld-session-cookie design (docs/adr's MFA-
// matrix slice) means Better Auth always mints a real session here,
// so equivalent enforcement has to happen at the request-routing
// layer instead: any authenticated request to any page other than
// the ones features/auth/mfa/mfa-setup-required.ts's
// isAlwaysAllowedPath exempts, made by a user whose setup is not yet
// genuinely complete (see that module's own isMfaSetupComplete
// comment for what that means), is redirected to /mfa-setup before
// it ever reaches the requested page - not a dashboard banner the
// user can navigate past, a real block on every request. The pure
// path/completion logic lives in that separate module specifically
// so it can be unit-tested directly (features/auth/mfa/__tests__/
// mfa-setup-required.test.ts) - proxy.ts itself is Next.js wiring
// only, not logic worth testing in isolation.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAlwaysAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.next();
  }

  const security = await userSecurityRepository.findByUserId(session.user.id);

  if (isMfaSetupComplete(security)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/mfa-setup", request.url));
}

export const config = {
  // Excludes Next.js internals and static assets - the same pattern
  // Next.js's own middleware docs use as their default matcher
  // example, adapted to this app's actual static file extensions
  // (public/ icons, manifest, etc.) rather than the docs' generic
  // placeholder list.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml).*)",
  ],
};
