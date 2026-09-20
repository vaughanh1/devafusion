"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { PasswordField } from "@/components/auth/password-field";
import { ResendVerificationEmailButton } from "@/components/auth/resend-verification-email-button";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import type { TurnstileWidgetHandle } from "@/components/auth/turnstile-widget";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { authClient } from "@/features/auth/auth-client";
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from "@/features/auth/password-strength";

type SignUpFormProps = {
  redirectPath: string;
  formTimingToken: string;
};

export function SignUpForm({ redirectPath, formTimingToken }: SignUpFormProps) {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);

  // ADR-0014: a Turnstile token is single-use and expires after 300
  // seconds - any failure path below must reset the widget so a retry
  // gets a fresh challenge rather than resending the same spent/stale
  // token (which Cloudflare's siteverify would reject with
  // timeout-or-duplicate, surfaced as a confusing "Captcha
  // verification failed" for what is really a wrong-password or
  // duplicate-email problem).
  function resetCaptcha() {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Explicit client-side error handling (mirrors the server-side rule
    // in src/web/AGENTS.md) - authClient methods resolve with a
    // { data, error } shape rather than throwing, but this still wraps
    // the call in case network failure throws before that shape forms.
    if (!isPasswordStrongEnough(password)) {
      setError("Please meet every password requirement listed below.");
      setIsSubmitting(false);
      return;
    }

    if (!captchaToken) {
      setError("Please complete the verification check before continuing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: redirectPath,
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
          // formTimingToken isn't part of signUp.email's typed
          // parameters, but Better Auth's own dynamic path proxy
          // (better-auth/dist/client/proxy) merges fetchOptions.body
          // into the outgoing request body, and /sign-up/email's own
          // server-side schema is intersected with
          // z.record(z.string(), z.any()) (verified directly against
          // the installed package), so this extra field arrives at
          // auth.ts's hooks.before intact - see
          // features/auth/form-timing-token.ts.
          body: { formTimingToken },
        },
      });

      if (signUpError) {
        setError(signUpError.message ?? "Could not create your account.");
        setIsSubmitting(false);
        resetCaptcha();
        return;
      }

      // requireEmailVerification (auth.ts) means a fresh sign-up gets
      // no session - confirmed directly against the installed
      // package's sign-up.mjs: token is explicitly null in this
      // case, with no Set-Cookie ever issued. Redirecting as if
      // signed in would be wrong; show the "check your email"
      // message instead and stop here, same page.
      if (!data?.token) {
        setNeedsVerification(true);
        setIsSubmitting(false);
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
      resetCaptcha();
    }
  }

  if (needsVerification) {
    return (
      <div className="mt-10 flex flex-col gap-4">
        <p role="status" className="text-lg leading-8 text-muted">
          Account created. Check your inbox at{" "}
          <span className="font-medium text-foreground">{email}</span> for a
          verification link before signing in.
        </p>
        <p className="text-sm text-muted">
          Lost or deleted the email? Request a new one below.
        </p>
        <ResendVerificationEmailButton email={email} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}

      <div className="flex flex-col gap-2">
        <label htmlFor={nameId} className="text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id={nameId}
          type="text"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

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
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
        value={password}
        onChange={setPassword}
        describedBy={error ? errorId : undefined}
        isInvalid={!!error}
      />

      <PasswordStrengthMeter password={password} />

      <TurnstileWidget onToken={setCaptchaToken} handleRef={turnstileRef} />

      <button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="min-h-[var(--touch-target-size)] cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
