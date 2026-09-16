import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";

const userSecurityRepository = new DrizzleUserSecurityRepository();

// UK GDPR Article 15 (right of access) - returns everything held on the
// requesting user's own account. Deliberately excludes the password
// hash (account.password, not exposed by auth.api.getSession/queried
// here at all) and the raw encrypted MFA secret (only whether MFA is
// enabled, never the ciphertext) - exporting either would hand the
// user a value with no legitimate use to them while creating a new
// exposure surface if the export itself were ever intercepted.
export async function GET() {
  // Explicit server-side error handling (src/web/AGENTS.md).
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const security = await userSecurityRepository.findByUserId(
      session.user.id,
    );

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
      security: {
        twoFactorEnabled: security?.twoFactorEnabled ?? false,
      },
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
