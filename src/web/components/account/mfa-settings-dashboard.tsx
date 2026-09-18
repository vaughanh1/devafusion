"use client";

import { useId, useState } from "react";

import { TotpEnrolment } from "@/components/account/totp-enrolment";
import { FormError } from "@/components/auth/form-error";

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

// 'use client' leaf (src/web/AGENTS.md Server-First, Leaf-Isolated
// Client Boundaries) - all state is local to this component; the
// account page's server shell renders no props derived from a
// database query into it.
export function MfaSettingsDashboard() {
  const passwordId = useId();
  const riskId = useId();
  const errorId = useId();

  const [selectedFactor, setSelectedFactor] = useState<FactorOption>("totp");
  const [mfaFrequency, setMfaFrequency] = useState<"always" | "30_days">(
    "always",
  );
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const isWeaker = WEAKER_OPTIONS.has(selectedFactor);
  const canSave = password.length > 0 && (!isWeaker || riskAcknowledged);

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

      {selectedFactor === "totp" && <TotpEnrolment />}

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

      <div className="flex flex-col gap-2">
        <label
          htmlFor={passwordId}
          className="text-sm font-medium text-foreground"
        >
          Confirm your password to save
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
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </div>

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
