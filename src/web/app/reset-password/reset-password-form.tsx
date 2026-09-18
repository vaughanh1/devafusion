"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { FormError } from "@/components/auth/form-error";
import { PasswordField } from "@/components/auth/password-field";
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter";
import { authClient } from "@/features/auth/auth-client";
import { isPasswordStrongEnough, MIN_PASSWORD_LENGTH } from "@/features/auth/password-strength";

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

    if (!isPasswordStrongEnough(newPassword)) {
      setError("Please meet every password requirement listed below.");
      return;
    }

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
      {error && <FormError id={errorId} message={error} />}

      <PasswordField
        id={passwordId}
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
        value={newPassword}
        onChange={setNewPassword}
        describedBy={error ? errorId : undefined}
        isInvalid={!!error}
      />

      <PasswordStrengthMeter password={newPassword} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-[var(--touch-target-size)] cursor-pointer border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
