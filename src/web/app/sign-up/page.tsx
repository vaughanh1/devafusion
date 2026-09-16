import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/app/sign-up/sign-up-form";
import { resolveSafeRedirectPath } from "@/features/auth/safe-redirect";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Devafusion account.",
  alternates: { canonical: "/sign-up" },
  robots: {
    // Sign-up/log-in pages carry no unique indexable content of their
    // own and should never appear in search results ahead of the
    // content pages they gate access to.
    index: false,
    follow: true,
  },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectPath = resolveSafeRedirectPath(params.redirect);

  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Account
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Create your account.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Already have an account?{" "}
        <Link
          href={{
            pathname: "/log-in",
            query: redirectPath === "/" ? undefined : { redirect: redirectPath },
          }}
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Log in
        </Link>
        .
      </p>

      <SignUpForm redirectPath={redirectPath} />
    </section>
  );
}
