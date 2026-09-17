"use client";

import { PASSWORD_STRENGTH_RULES } from "@/features/auth/password-strength";

type PasswordStrengthMeterProps = {
  password: string;
  id?: string;
};

// Real-time replacement for relying on the browser's own generic
// "Please lengthen this text to X characters" validation tooltip
// (which says nothing about complexity at all) - lists every rule
// from features/auth/password-strength.ts with a live pass/fail
// state. Color is never the sole signal (src/web/AGENTS.md): each
// rule also swaps its glyph and uses aria-hidden so the state is
// exposed to assistive tech via the text itself, not decoration.
export function PasswordStrengthMeter({ password, id }: PasswordStrengthMeterProps) {
  return (
    <ul id={id} className="flex flex-col gap-1 text-sm">
      {PASSWORD_STRENGTH_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 ${met ? "text-foreground" : "text-muted"}`}
          >
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
