"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { MfaChallengeForm } from "@/components/auth/mfa-challenge-form";
import { PasswordField } from "@/components/auth/password-field";
import type { TurnstileWidgetHandle } from "@/components/auth/turnstile-widget";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { notifySessionChanged } from "@/features/auth/auth-client";

type LogInFormProps = {
  redirectPath: string;
  formTimingToken: string;
};

type MfaChallengeState = {
  pendingToken: string;
  factorNeeded: "totp" | "email" | "backup_code";
};

// Calls /api/auth/login-step1 (the MFA-matrix-aware policy
// evaluation route) rather than Better Auth's own
// authClient.signIn.email() directly - the latter always mints and
// releases a full session immediately, with no hook for this
// project's own sequential-factor challenge. login-step1 withholds
// the session until the matrix is satisfied; see docs/adr/0015.
export function LogInForm({ redirectPath, formTimingToken }: LogInFormProps) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallengeState | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  // See sign-up-form.tsx's identical comment - a spent/stale
  // Turnstile token must not be resent on any retry.
  function resetCaptcha() {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!captchaToken) {
      setError("Please complete the verification check before continuing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login-step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken, formTimingToken }),
      });

      if (!response.ok) {
        // A 403 is login-step1's own distinct "email not verified"
        // status (not a credential guess) - safe to echo verbatim,
        // unlike the 401 branch below: telling a user their own
        // email needs verifying does not distinguish "no such user"
        // from "wrong password" the way echoing a real auth failure
        // message would (this form's existing account-enumeration
        // rationale, unchanged for that branch).
        if (response.status === 403) {
          const body = await response.json().catch(() => null);
          setError(
            body?.error ??
              "Please verify your email address before signing in.",
          );
          setIsSubmitting(false);
          resetCaptcha();
          return;
        }

        setError("Invalid email or password.");
        setIsSubmitting(false);
        resetCaptcha();
        return;
      }

      const body = await response.json();

      if (body.mfaRequired) {
        setMfaChallenge({
          pendingToken: body.pendingToken,
          factorNeeded: body.nextFactorNeeded,
        });
        setIsSubmitting(false);
        return;
      }

      // The session was just minted by login-step1's own server-side
      // signInEmail call, entirely outside authClient's dispatch -
      // router.refresh() alone only invalidates Server Component
      // data, not authClient.useSession()'s client-side nanostore
      // (AccountNav's header, e.g.), which would otherwise keep
      // showing stale logged-out state until an unrelated refetch
      // trigger (hard reload, window-focus) happens to fire.
      notifySessionChanged();
      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
      resetCaptcha();
    }
  }

  if (mfaChallenge) {
    return (
      <MfaChallengeForm
        redirectPath={redirectPath}
        initialPendingToken={mfaChallenge.pendingToken}
        initialFactorNeeded={mfaChallenge.factorNeeded}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}

      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <PasswordField
        id={passwordId}
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        describedBy={error ? errorId : undefined}
        isInvalid={!!error}
      />

      <TurnstileWidget onToken={setCaptchaToken} handleRef={turnstileRef} />

      <button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="min-h-[var(--touch-target-size)] cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
