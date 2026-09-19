"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/features/auth/auth-client";

const CONFIRMATION_PHRASE = "delete my account";

export function DeleteAccountForm() {
  const router = useRouter();
  const passwordId = useId();
  const confirmationId = useId();
  const errorId = useId();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfirmed = confirmation.trim().toLowerCase() === CONFIRMATION_PHRASE;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isConfirmed) {
      setError(`Type "${CONFIRMATION_PHRASE}" to confirm.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: deleteError } = await authClient.deleteUser({
        password,
      });

      if (deleteError) {
        setError(
          deleteError.message ??
            "Could not delete your account. Check your password and try again.",
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}

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

      <div className="flex flex-col gap-2">
        <label
          htmlFor={confirmationId}
          className="text-sm font-medium text-foreground"
        >
          Type &quot;{CONFIRMATION_PHRASE}&quot; to confirm
        </label>
        <input
          id={confirmationId}
          type="text"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isConfirmed}
        // data-touch-target-force="aaa" (globals.css) - an
        // irreversible, destructive action stays pinned to the
        // stricter 44px WCAG 2.2 AAA target regardless of the
        // visitor's own site-wide AA/AAA touch-target preference.
        // This is the one control on this site where the consequence
        // of a mis-tap (permanently deleting an account, no undo) is
        // severe enough to justify overriding a user's own denser-
        // layout choice, rather than deferring to it as every other
        // control does.
        data-touch-target-force="aaa"
        className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-surface-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
