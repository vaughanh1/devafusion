import type { Metadata } from "next";
import Link from "next/link";

import { LogInForm } from "@/app/log-in/log-in-form";
import { resolveSafeRedirectPath } from "@/features/auth/safe-redirect";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Devafusion account.",
  alternates: { canonical: "/log-in" },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function LogInPage({
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
        Log in.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href={{
            pathname: "/sign-up",
            query: redirectPath === "/" ? undefined : { redirect: redirectPath },
          }}
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Sign up
        </Link>
        .
      </p>

      <LogInForm redirectPath={redirectPath} />
    </section>
  );
}
