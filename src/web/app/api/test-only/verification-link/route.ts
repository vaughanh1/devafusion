import { NextResponse } from "next/server";

import {
  consumeTestVerificationLink,
  isTestVerificationCaptureEnabled,
} from "@/features/auth/test-verification-link-cache";

// Test-only endpoint - 404s outright unless TEST_DB_ACTIONS or
// TEST_MFA_FLOWS is set (isTestVerificationCaptureEnabled, same
// toggles auth.ts's capture call already gates on), so this has zero
// surface in a real deployment: the route exists in the built
// bundle, but every real request to it in production returns 404
// before touching the cache at all. Lets tests-e2e/sign-up.spec.ts
// and mfa-flow.spec.ts fetch the real verification link auth.ts just
// captured and navigate to it directly, rather than intercepting an
// actual inbox or duplicating Better Auth's own internal JWT secret.
export async function GET(request: Request) {
  if (!isTestVerificationCaptureEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Missing email query parameter" },
      { status: 400 },
    );
  }

  const url = consumeTestVerificationLink(email);
  if (!url) {
    return NextResponse.json(
      { error: "No captured verification link for this email" },
      { status: 404 },
    );
  }

  return NextResponse.json({ url });
}
