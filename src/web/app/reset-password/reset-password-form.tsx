"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { PasswordField } from "@/components/auth/password-field";
import { authClient } from "@/features/auth/auth-client";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const passwordId = useId();
  const errorId = useId();

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (resetError) {
        setError(resetError.message ?? "Could not reset your password.");
        setIsSubmitting(false);
        return;
      }

      router.push("/log-in");
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

      <PasswordField
        id={passwordId}
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        minLength={8}
        required
        value={newPassword}
        onChange={setNewPassword}
        describedBy={error ? errorId : undefined}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-11 cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
