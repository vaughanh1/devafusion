import type { Metadata } from "next";
import Link from "next/link";

import { ForgetPasswordForm } from "@/app/forget-password/forget-password-form";
import { createFormTimingToken } from "@/features/auth/form-timing-token";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your Devafusion account.",
  alternates: { canonical: "/forget-password" },
  robots: {
    index: false,
    follow: true,
  },
};

// ADR-0014: forces dynamic rendering. Unlike /sign-up and /log-in
// (already dynamic because their page components await searchParams),
// this page has no dynamic API usage of its own, so Next.js would
// otherwise statically prerender it at build time - which is exactly
// wrong for createFormTimingToken() below, since the token must
// reflect a real visitor's real render time, not a single value baked
// into the build output and reused by every visitor forever.
export const dynamic = "force-dynamic";

export default function ForgetPasswordPage() {
  const formTimingToken = createFormTimingToken();

  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Account
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Reset your password.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Enter your account email and, if it matches an account, we&apos;ll
        send a link to reset your password.{" "}
        <Link
          href="/log-in"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Back to log in
        </Link>
        .
      </p>

      <ForgetPasswordForm formTimingToken={formTimingToken} />

      <p className="mt-6 text-sm text-muted">
        See our{" "}
        <Link
          href="/legal"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Privacy &amp; cookies policy
        </Link>{" "}
        for how your account data is used.
      </p>
    </section>
  );
}
