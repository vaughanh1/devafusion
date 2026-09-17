"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { PasswordField } from "@/components/auth/password-field";
import type { TurnstileWidgetHandle } from "@/components/auth/turnstile-widget";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { authClient } from "@/features/auth/auth-client";

type LogInFormProps = {
  redirectPath: string;
  formTimingToken: string;
};

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
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirectPath,
        fetchOptions: {
          headers: { "x-captcha-response": captchaToken },
          // See sign-up-form.tsx's identical comment - formTimingToken
          // is merged into the request body via fetchOptions.body by
          // Better Auth's dynamic path proxy, since it isn't part of
          // signIn.email's own typed parameters.
          body: { formTimingToken },
        },
      });

      if (signInError) {
        // Deliberately generic rather than echoing Better Auth's own
        // message verbatim here - it can distinguish "no such user"
        // from "wrong password" in ways that enable account
        // enumeration. A single message for any credential failure.
        setError("Invalid email or password.");
        setIsSubmitting(false);
        resetCaptcha();
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

      <PasswordField
        id={passwordId}
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        describedBy={error ? errorId : undefined}
      />

      <TurnstileWidget onToken={setCaptchaToken} handleRef={turnstileRef} />

      <button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="min-h-11 cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
