"use client";

import { useId, useState } from "react";

import { PASSWORD_RULES_ATTRIBUTE } from "@/features/auth/password-strength";

type PasswordFieldProps = {
  id: string;
  label: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  required?: boolean;
  describedBy?: string;
};

// Shared across SignUpForm, LogInForm and ResetPasswordForm rather
// than duplicating the same reveal-toggle markup three times - added
// alongside the Turnstile widget work in this same slice since all
// three forms were already being touched (docs/adr/0014), matching
// the show/hide affordance visible on Cloudflare's own dashboard
// sign-up form.
export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  onChange,
  minLength,
  required,
  describedBy,
}: PasswordFieldProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const toggleId = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={isRevealed ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          // ADR-0014: passwordrules only makes sense for a NEW
          // password field - it tells the browser's generator what
          // to produce, which is meaningless (and would be
          // misleading) on a current-password field being used to
          // log in with an existing, already-chosen password.
          {...(autoComplete === "new-password"
            ? { passwordRules: PASSWORD_RULES_ATTRIBUTE }
            : {})}
          className="min-h-11 w-full border border-surface-border bg-background px-3 pr-16 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          id={toggleId}
          type="button"
          onClick={() => setIsRevealed((current) => !current)}
          aria-pressed={isRevealed}
          // Name-role-value (src/web/AGENTS.md's accessibility checklist)
          // - the accessible name changes with state, same pattern as a
          // native reveal toggle, so screen reader users hear the
          // control's current effect rather than a static label.
          aria-label={isRevealed ? "Hide password" : "Show password"}
          className="absolute right-2 min-h-11 cursor-pointer px-2 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {isRevealed ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
