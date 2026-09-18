"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { notifySessionChanged } from "@/features/auth/auth-client";

type FactorType = "totp" | "email" | "backup_code";

type MfaChallengeFormProps = {
  redirectPath: string;
  initialPendingToken: string;
  initialFactorNeeded: FactorType;
};

const FACTOR_LABELS: Record<FactorType, string> = {
  totp: "Enter the 6-digit code from your authenticator app",
  email: "Enter the 6-digit code we emailed you",
  backup_code: "Enter one of your backup codes",
};

// A backup code has no numeric-grouping concern (it's alphanumeric,
// not digits), so only totp/email factors get the spaced
// placeholder/pattern hint - matches the accessible formatting the
// email itself uses (format-otp-for-accessibility.ts), so a sighted
// user reading either the email or this field sees a consistent
// convention.
function isNumericFactor(factor: FactorType): boolean {
  return factor === "totp" || factor === "email";
}

// Handles the full chained sequence server-side dictates: each
// submission can return either { verified: true } (done - release
// cookies already happened server-side, just navigate) or
// { verified: false, nextFactorNeeded, pendingToken } (202, loop
// again with the new factor/token) - the UI re-renders for the next
// factor without a full page reload.
export function MfaChallengeForm({
  redirectPath,
  initialPendingToken,
  initialFactorNeeded,
}: MfaChallengeFormProps) {
  const router = useRouter();
  const codeId = useId();
  const errorId = useId();
  const trustDeviceId = useId();

  const [pendingToken, setPendingToken] = useState(initialPendingToken);
  const [factorNeeded, setFactorNeeded] = useState<FactorType>(initialFactorNeeded);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingToken,
          // Backup codes carry their own casing/hyphenation; a
          // numeric factor's spaces (if a user copies the
          // accessible-formatted email text verbatim) are stripped
          // before submission - the server always expects a bare
          // string with no separators.
          code: isNumericFactor(factorNeeded) ? code.replace(/\s+/g, "") : code,
          factorType: factorNeeded,
          trustDevice,
        }),
      });

      if (response.status === 410) {
        setError("This verification session has expired. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      if (response.status === 202) {
        const body = await response.json();
        setPendingToken(body.pendingToken);
        setFactorNeeded(body.nextFactorNeeded);
        setCode("");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Invalid or expired code.");
        setIsSubmitting(false);
        return;
      }

      // Same rationale as log-in-form.tsx's identical call -
      // two-factor/verify's own server-side release of the withheld
      // session cookies never goes through authClient's dispatch, so
      // authClient.useSession()'s client-side nanostore needs an
      // explicit nudge or it keeps showing stale logged-out state.
      notifySessionChanged();
      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}

      <div className="flex flex-col gap-2">
        <label htmlFor={codeId} className="text-sm font-medium text-foreground">
          {FACTOR_LABELS[factorNeeded]}
        </label>
        <input
          id={codeId}
          type="text"
          name="code"
          inputMode={isNumericFactor(factorNeeded) ? "numeric" : "text"}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="min-h-11 border border-surface-border bg-background px-3 text-base tracking-widest text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <label className="flex items-center gap-3 text-base text-foreground">
        <input
          id={trustDeviceId}
          type="checkbox"
          checked={trustDevice}
          onChange={(event) => setTrustDevice(event.target.checked)}
          className="size-4"
        />
        Trust this device for 30 days
      </label>

      <button
        type="submit"
        disabled={isSubmitting || code.length === 0}
        className="min-h-11 cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
