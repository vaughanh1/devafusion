"use client";

import { useId, useState } from "react";

import { TotpEnrolment } from "@/components/account/totp-enrolment";
import { FormError } from "@/components/auth/form-error";
import { PasswordField } from "@/components/auth/password-field";

type FactorOption = "totp" | "email" | "none";

const FACTOR_LABELS: Record<FactorOption, string> = {
  totp: "Authenticator App (TOTP)",
  email: "Email OTP",
  none: "None",
};

// Options weaker than the UK GDPR Article 25 default
// (['password', 'totp']) - selecting either requires the risk
// acknowledgement checkbox below before the save button unlocks.
const WEAKER_OPTIONS = new Set<FactorOption>(["email", "none"]);

function toRequiredFactors(option: FactorOption): string[] {
  if (option === "none") return ["password"];
  return ["password", option];
}

// Inverse of toRequiredFactors - derives the UI's own FactorOption
// vocabulary from a real saved requiredFactors array. Real bug this
// closes: the account page previously never called this at all,
// always defaulting to "totp" regardless of what was actually saved.
function toFactorOption(requiredFactors: string[] | undefined): FactorOption {
  if (!requiredFactors) return "totp";
  if (requiredFactors.includes("totp")) return "totp";
  if (requiredFactors.includes("email")) return "email";
  return "none";
}

type MfaSettingsDashboardProps = {
  // undefined = no user_security row exists yet (a fresh account
  // that has never saved a choice) - falls back to this table's own
  // schema default (['password', 'totp']), never silently treated
  // as "none".
  initialRequiredFactors?: string[];
  initialMfaFrequency?: "always" | "30_days";
  // Whether TOTP is CONFIRMED and active right now, not merely
  // selected - directly surfaces the row-existence-vs-complete
  // distinction (features/auth/mfa/mfa-setup-required.ts) that was
  // previously invisible on this page, a real contributor to user
  // confusion about whether enrolment had actually finished.
  initialTotpConfirmed?: boolean;
};

// 'use client' leaf (src/web/AGENTS.md Server-First, Leaf-Isolated
// Client Boundaries) - initial state now comes from real server-
// fetched props (account/page.tsx), not hardcoded guesses; all
// interaction state past that first render stays local to this
// component exactly as before.
export function MfaSettingsDashboard({
  initialRequiredFactors,
  initialMfaFrequency,
  initialTotpConfirmed = false,
}: MfaSettingsDashboardProps) {
  const passwordId = useId();
  const riskId = useId();
  const errorId = useId();

  const [selectedFactor, setSelectedFactor] = useState<FactorOption>(
    toFactorOption(initialRequiredFactors),
  );
  const [mfaFrequency, setMfaFrequency] = useState<"always" | "30_days">(
    initialMfaFrequency ?? "always",
  );
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // Tracks whether TOTP is GENUINELY confirmed right now, independent
  // of whether it's merely the currently-selected radio option. Real,
  // reported lockout this closes: selecting "Authenticator App" was
  // previously always saveable, even with no confirmed secret behind
  // it at all - login-step1.ts would then require a factor with no
  // way to ever produce a matching code.
  const [totpConfirmed, setTotpConfirmed] = useState(initialTotpConfirmed);

  const isWeaker = WEAKER_OPTIONS.has(selectedFactor);
  const totpNotYetConfirmed = selectedFactor === "totp" && !totpConfirmed;
  const canSave =
    password.length > 0 && (!isWeaker || riskAcknowledged) && !totpNotYetConfirmed;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedMessage(null);

    if (!canSave) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/user/security/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          requiredFactors: toRequiredFactors(selectedFactor),
          mfaFrequency,
          riskAcknowledged: isWeaker ? riskAcknowledged : undefined,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not save your settings. Please try again.");
        setIsSaving(false);
        return;
      }

      setSavedMessage("Your security settings have been saved.");
      setPassword("");
      setIsSaving(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}
      {savedMessage && (
        <p role="status" className="text-sm font-medium text-foreground">
          {savedMessage}
        </p>
      )}

      {/* Real gap this closes: nothing on this page previously told a
          user whether an authenticator app they'd started setting up
          had ever actually been confirmed (row-existence vs
          twoFactorEnabled - see mfa-setup-required.ts's own comment
          on why those are NOT the same thing). A user re-clicking
          "Set up authenticator app" with no idea it was already
          active, or that it never finished confirming, was a real,
          reported source of confusion. */}
      {selectedFactor === "totp" && (
        <p className="text-sm text-muted">
          {totpConfirmed
            ? "Authenticator app is confirmed and active."
            : "Authenticator app is not yet confirmed - finish scanning the code below before saving."}
        </p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">
          Second factor
        </legend>
        {(Object.keys(FACTOR_LABELS) as FactorOption[]).map((option) => (
          <label
            key={option}
            className="flex min-h-[var(--touch-target-size)] items-center gap-3 text-base text-foreground"
          >
            <input
              type="radio"
              name="factor"
              value={option}
              checked={selectedFactor === option}
              onChange={() => {
                setSelectedFactor(option);
                setRiskAcknowledged(false);
              }}
              className="size-4"
            />
            {FACTOR_LABELS[option]}
          </label>
        ))}
      </fieldset>

      {selectedFactor === "totp" && (
        <TotpEnrolment
          onConfirmed={() => setTotpConfirmed(true)}
          onEnrolmentStarted={() => setTotpConfirmed(false)}
        />
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-foreground">
          Re-challenge frequency
        </legend>
        <label className="flex min-h-[var(--touch-target-size)] items-center gap-3 text-base text-foreground">
          <input
            type="radio"
            name="frequency"
            value="always"
            checked={mfaFrequency === "always"}
            onChange={() => setMfaFrequency("always")}
            className="size-4"
          />
          Every sign-in
        </label>
        <label className="flex min-h-[var(--touch-target-size)] items-center gap-3 text-base text-foreground">
          <input
            type="radio"
            name="frequency"
            value="30_days"
            checked={mfaFrequency === "30_days"}
            onChange={() => setMfaFrequency("30_days")}
            className="size-4"
          />
          Trust this device for 30 days
        </label>
      </fieldset>

      {isWeaker && (
        <div
          role="alert"
          className="flex flex-col gap-3 border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning"
        >
          <p className="flex items-start gap-2 font-medium">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            >
              <path d="M12 2 1 21h22L12 2Zm0 6.5c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1v-5c0-.55.45-1 1-1ZM11 17h2v2h-2v-2Z" />
            </svg>
            <span>
              This configuration is weaker than this account&apos;s default
              protection and increases the risk of unauthorized access.
            </span>
          </p>
          <label className="flex min-h-[var(--touch-target-size)] items-center gap-3">
            <input
              id={riskId}
              type="checkbox"
              checked={riskAcknowledged}
              onChange={(event) => setRiskAcknowledged(event.target.checked)}
              className="size-4"
            />
            I understand and accept this risk.
          </label>
        </div>
      )}

      <PasswordField
        id={passwordId}
        label="Confirm your password to save"
        name="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        describedBy={error ? errorId : undefined}
        isInvalid={!!error}
      />

      <button
        type="submit"
        disabled={isSaving || !canSave}
        className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save security settings"}
      </button>
    </form>
  );
}
