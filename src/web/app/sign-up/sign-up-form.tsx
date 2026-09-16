"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { authClient } from "@/features/auth/auth-client";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Explicit client-side error handling (mirrors the server-side rule
    // in src/web/AGENTS.md) - authClient methods resolve with a
    // { data, error } shape rather than throwing, but this still wraps
    // the call in case network failure throws before that shape forms.
    if (!captchaToken) {
      setError("Please complete the verification check before continuing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
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
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
      {error && (
        <p
          id={errorId}
          role="alert"
          className="border border-surface-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
        >
          {error}
        </p>
      )}

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
          className="min-h-11 border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          className="min-h-11 border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <PasswordField
        id={passwordId}
        label="Password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        value={password}
        onChange={setPassword}
        describedBy={error ? errorId : undefined}
      />

      <TurnstileWidget onToken={setCaptchaToken} />

      <button
        type="submit"
        disabled={isSubmitting || !captchaToken}
        className="min-h-11 border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
