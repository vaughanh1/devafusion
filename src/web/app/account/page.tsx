import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DeleteAccountForm } from "@/app/account/delete-account-form";
import { ExportDataButton } from "@/app/account/export-data-button";

export const metadata: Metadata = {
  title: "Your account",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function AccountPage() {
  // Server-side, not the client-side authClient.useSession() pattern
  // used in AccountNav - unlike the header (rendered on every page,
  // where a server session read would force site-wide dynamic
  // rendering), this page is inherently per-user and already needs a
  // redirect decided before first paint, so there is no static-
  // rendering benefit to preserve here.
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/log-in?redirect=%2Faccount");
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Account
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Your account.
      </h1>

      <div className="mt-10 space-y-2 text-lg leading-8 text-muted">
        <p>
          <span className="font-medium text-foreground">Name:</span>{" "}
          {session.user.name}
        </p>
        <p>
          <span className="font-medium text-foreground">Email:</span>{" "}
          {session.user.email}
        </p>
      </div>

      <div className="mt-12 border-t border-surface-border pt-10">
        <h2 className="text-xl font-semibold text-foreground">Your data</h2>
        <p className="mt-2 text-lg leading-8 text-muted">
          Download a copy of everything held on your account, per UK GDPR
          Article 15.
        </p>
        <div className="mt-4">
          <ExportDataButton />
        </div>
      </div>

      <div className="mt-12 border-t border-surface-border pt-10">
        <h2 className="text-xl font-semibold text-foreground">
          Delete your account
        </h2>
        <p className="mt-2 text-lg leading-8 text-muted">
          Permanently deletes your account and every record associated with
          it, per UK GDPR Article 17. This cannot be undone.
        </p>
        <DeleteAccountForm />
      </div>
    </section>
  );
}
