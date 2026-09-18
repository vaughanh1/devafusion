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
  // Screen-reader form-error requirement: aria-describedby alone
  // links the field to the error text, but does not itself flag the
  // field as invalid in the accessibility tree - a screen reader
  // only reads the description if the user happens to navigate onto
  // it. aria-invalid is what actually announces "invalid entry" when
  // the field receives focus. Callers pass this as !!error (a
  // boolean, not the error object) so the DOM attribute is always
  // exactly "true" or "false", never absent - explicit false is
  // correct here, unlike describedBy's undefined-when-clean pattern,
  // because aria-invalid has no equivalent "absent means valid"
  // convention screen readers can rely on.
  isInvalid?: boolean;
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
  isInvalid,
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
          aria-invalid={!!isInvalid}
          // ADR-0014: passwordrules only makes sense for a NEW
          // password field - it tells the browser's generator what
          // to produce, which is meaningless (and would be
          // misleading) on a current-password field being used to
          // log in with an existing, already-chosen password.
          // Lowercase "passwordrules" (not camelCase "passwordRules")
          // - it's a non-standard HTML attribute (Safari/WebKit's own
          // password-generation-rules feature), not a recognized
          // React DOM prop, so React only passes it through as a
          // custom attribute when spelled exactly as the browser
          // expects; camelCasing it produces "React does not
          // recognize the `passwordRules` prop on a DOM element" in
          // the console and never reaches the DOM at all.
          {...(autoComplete === "new-password"
            ? { passwordrules: PASSWORD_RULES_ATTRIBUTE }
            : {})}
          className="min-h-[var(--touch-target-size)] w-full border border-surface-border bg-background px-3 pr-16 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
          // min-w-[var(--touch-target-size)] alongside min-h-[var(--touch-target-size)]: WCAG 2.2 SC 2.5.5 (Target
          // Size, AAA) and the 44x44 CSS px minimum this project
          // holds every interactive control to - px-2 alone gave
          // this button a real clickable width of roughly the
          // "Show"/"Hide" text plus 8px each side (well under 44px),
          // even though its height already cleared the bar.
          className="absolute right-2 flex min-h-[var(--touch-target-size)] min-w-[var(--touch-target-size)] cursor-pointer items-center justify-center px-2 text-xs font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {isRevealed ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
