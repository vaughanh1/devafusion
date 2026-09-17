"use client";

import { useId, useRef, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import type { TurnstileWidgetHandle } from "@/components/auth/turnstile-widget";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { authClient } from "@/features/auth/auth-client";

type ForgetPasswordFormProps = {
  formTimingToken: string;
};

export function ForgetPasswordForm({ formTimingToken }: ForgetPasswordFormProps) {
  const emailId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Better Auth's own /request-password-reset handler returns the same
  // generic "if this email exists..." message whether or not the
  // account exists (verified directly against the installed package -
  // it deliberately simulates a dummy token generation and database
  // lookup on the not-found path to keep response timing consistent
  // too) - this client state mirrors that by having only one success
  // outcome, never a per-outcome message.
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (!captchaToken) {
      setError("Please complete the verification check before continuing.");
      return;
    }

    setIsSubmitting(true);

    try {
      // authClient's dynamic path proxy (better-auth/dist/client/proxy)
      // maps requestPasswordReset -> toKebabCase -> /request-password-
      // reset, verified directly against the installed package rather
      // than assumed from documentation.
      const { error: requestError } = await authClient.requestPasswordReset(
        {
          email,
          redirectTo: "/reset-password",
        },
        {
          headers: { "x-captcha-response": captchaToken },
          // See sign-up-form.tsx's identical comment - merged into the
          // request body by Better Auth's dynamic path proxy.
          body: { formTimingToken },
        },
      );

      if (requestError) {
        setError("Something went wrong. Please try again.");
        setIsSubmitting(false);
        resetCaptcha();
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
      resetCaptcha();
    }
  }

  if (isSubmitted) {
    return (
      <p
        role="status"
        className="mt-10 border border-surface-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
      >
        If that email exists in our system, a password reset link has been
        sent to it.
      </p>
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
          className="min-h-11 border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <TurnstileWidget onToken={setCaptchaToken} handleRef={turnstileRef} />

      <button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="min-h-11 cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
