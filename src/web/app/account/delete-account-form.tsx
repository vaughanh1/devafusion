"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

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
        <label
          htmlFor={passwordId}
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id={passwordId}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

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
          className="min-h-11 border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isConfirmed}
        className="min-h-11 self-start border border-surface-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Deleting…" : "Permanently delete my account"}
      </button>
    </form>
  );
}
