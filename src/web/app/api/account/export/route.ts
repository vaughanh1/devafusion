import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { buildMfaExportPayload } from "@/features/auth/mfa/mfa-export-handler";
import { consumeRateLimit } from "@/features/auth/rate-limit";

// ADR-0014: outside Better Auth's own router (see two-factor/verify's
// identical comment) - a looser window/max than the TOTP route, since
// this is an authenticated user exporting their own data rather than a
// credential brute-force target, but still bounded so a compromised
// session or scripted client can't hammer the database repeatedly.
const EXPORT_RATE_LIMIT = { windowMs: 60_000, max: 10 };

// UK GDPR Article 15 (right of access) - returns everything held on the
// requesting user's own account. Deliberately excludes the password
// hash (account.password, not exposed by auth.api.getSession/queried
// here at all) and the raw encrypted MFA secret (only whether MFA is
// enabled, never the ciphertext) - exporting either would hand the
// user a value with no legitimate use to them while creating a new
// exposure surface if the export itself were ever intercepted.
export async function GET(request: NextRequest) {
  // Explicit server-side error handling (src/web/AGENTS.md).
  try {
    const rateLimitResult = await consumeRateLimit(
      request,
      "/api/account/export",
      EXPORT_RATE_LIMIT,
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "X-Retry-After": rateLimitResult.retryAfterSeconds.toString() },
        },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const security = await buildMfaExportPayload(session.user.id);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      },
      security,
      currentSession: {
        createdAt: session.session.createdAt,
        expiresAt: session.session.expiresAt,
      },
    };

    return NextResponse.json(exportPayload, {
      headers: {
        "Content-Disposition":
          'attachment; filename="devafusion-account-data.json"',
      },
    });
  } catch (error) {
    console.error("Account data export failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
