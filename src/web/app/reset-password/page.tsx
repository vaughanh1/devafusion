import type { Metadata } from "next";

import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Set a new password for your Devafusion account.",
  alternates: { canonical: "/reset-password" },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  const linkError = typeof params.error === "string" ? params.error : null;

  return (
    <section className="mx-auto max-w-md px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Account
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Set a new password.
      </h1>

      {linkError || !token ? (
        <p
          role="alert"
          className="mt-10 border border-surface-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
        >
          This password reset link is invalid or has expired. Request a
          new one from the forgot password page.
        </p>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </section>
  );
}
