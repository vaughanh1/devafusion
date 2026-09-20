"use client";

import { useState } from "react";

import { authClient } from "@/features/auth/auth-client";

type ResendVerificationEmailButtonProps = {
  email: string;
};

// Real production lockout closed by this component: an account whose
// original verification email is lost/deleted (spam filter, an
// accidental delete, an expired link) previously had NO way back in
// at all. Re-signing up with the same email hits Better Auth's own
// generic-duplicate-response path (confirmed directly against the
// installed sign-up.mjs), which never re-sends anything - the UI
// says "check your inbox" while genuinely sending nothing new.
//
// Wired to Better Auth's own /send-verification-email endpoint
// (authClient.sendVerificationEmail) rather than a bespoke route -
// it dispatches through this project's own auth.ts callback
// (emailVerification.sendVerificationEmail), which is wired to
// sendTransactionalLinkEmail -> Azure Communication Services, the
// same UK-hosted processor already disclosed on /legal for this
// exact purpose. No new processor, no new disclosure required.
//
// Deliberately no client-side existence/already-verified check
// before calling this: the installed endpoint's own server-side
// implementation (confirmed directly against email-verification.mjs)
// already enforces a constant-time floor so "no such account" /
// "already verified" / "really sent" are indistinguishable by
// response timing - re-implementing that guard here would only add
// a weaker, redundant check.
export function ResendVerificationEmailButton({
  email,
}: ResendVerificationEmailButtonProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleClick() {
    setStatus("sending");
    try {
      await authClient.sendVerificationEmail({ email });
    } catch {
      // Deliberately swallowed, not surfaced as an error: per this
      // endpoint's own anti-enumeration design, a genuine failure
      // (rate-limited, transient ACS error) must look identical to
      // "already verified"/"no such account" to a caller - showing a
      // distinct error message here would leak exactly the
      // information the endpoint's constant-time floor exists to
      // hide. The generic "sent" confirmation is correct either way.
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p role="status" className="text-sm font-medium text-foreground">
        If an account needs verifying, a new link has been sent.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "sending"}
      className="min-h-[var(--touch-target-size)] cursor-pointer self-start text-sm font-medium text-foreground underline decoration-muted underline-offset-4 transition-colors hover:decoration-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {status === "sending" ? "Sending…" : "Resend verification email"}
    </button>
  );
}
