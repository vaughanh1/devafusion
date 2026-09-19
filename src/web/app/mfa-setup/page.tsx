import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MfaSettingsDashboard } from "@/components/account/mfa-settings-dashboard";
import { DrizzleUserSecurityRepository } from "@/features/auth/mfa/drizzle-user-security-repository";
import { isMfaSetupComplete } from "@/features/auth/mfa/mfa-setup-required";

const userSecurityRepository = new DrizzleUserSecurityRepository();

export const metadata: Metadata = {
  title: "Set up account security",
  robots: {
    index: false,
    follow: true,
  },
};

// UK GDPR Article 25 parity with requireEmailVerification (auth.ts) -
// proxy.ts already blocks every other route for a signed-in account
// with no genuinely completed user_security choice, redirecting here
// instead. This page re-checks the identical completion condition
// itself rather than only trusting proxy.ts ran (defense in depth,
// matching account/page.tsx's own existing session-check pattern),
// covering two cases proxy.ts's own ALWAYS_ALLOWED_PREFIXES leaves
// open on this exact path: an unauthenticated request landing here
// directly (sent to /log-in, same as account/page.tsx) and an
// already-complete account navigating back here on purpose (sent to
// /account instead, since there is nothing left to force).
export default async function MfaSetupPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/log-in?redirect=%2Fmfa-setup");
  }

  const security = await userSecurityRepository.findByUserId(session.user.id);

  if (isMfaSetupComplete(security)) {
    redirect("/account");
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Account security
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Choose your second factor.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Before you can use your account, choose the second factor required at
        sign-in - an authenticator app, an emailed one-time code, or (not
        recommended) password only. You cannot access any other page until
        this is saved.
      </p>

      <MfaSettingsDashboard />
    </section>
  );
}
