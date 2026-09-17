"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { FormError } from "@/components/auth/form-error";

type EnrolmentStep =
  | { stage: "idle" }
  | {
      stage: "scanning";
      qrCodeDataUri: string;
      manualEntrySecret: string;
      backupCodes: string[];
    }
  | { stage: "confirmed" };

// 12-character alphanumeric backup codes have no natural numeric-
// grouping convention (unlike the 6-digit TOTP/email codes -
// format-otp-for-accessibility.ts) - they are already an
// unambiguous run using an alphabet with no 0/O/1/I confusion
// (backup-code-hash.ts), so no further reformatting is applied
// here; each is simply rendered on its own line/list item so a
// screen reader announces them one at a time rather than as one
// run-on sentence.
export function TotpEnrolment() {
  const codeId = useId();
  const errorId = useId();

  const [step, setStep] = useState<EnrolmentStep>({ stage: "idle" });
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function startEnrolment() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/two-factor/enrol", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not start enrolment. Please try again.");
        setIsLoading(false);
        return;
      }

      const body = await response.json();
      setStep({
        stage: "scanning",
        qrCodeDataUri: body.qrCodeDataUri,
        manualEntrySecret: body.manualEntrySecret,
        backupCodes: body.backupCodes,
      });
      setIsLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/two-factor/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Invalid or expired code.");
        setIsLoading(false);
        return;
      }

      setStep({ stage: "confirmed" });
      setIsLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  if (step.stage === "idle") {
    return (
      <div className="flex flex-col gap-3">
        {error && <FormError message={error} />}
        <button
          type="button"
          onClick={startEnrolment}
          disabled={isLoading}
          className="min-h-11 cursor-pointer self-start border border-surface-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Starting…" : "Set up authenticator app"}
        </button>
      </div>
    );
  }

  if (step.stage === "confirmed") {
    return (
      <p role="status" className="text-sm font-medium text-foreground">
        Authenticator app enabled. Use it the next time you sign in.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <FormError id={errorId} message={error} />}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          Scan this QR code with your authenticator app
        </p>
        {/* unoptimized: this is a locally-generated data: URI, not a
            remote resource - Next's image optimizer has nothing to
            fetch/resize and would otherwise error on a data URI. */}
        <Image
          src={step.qrCodeDataUri}
          alt={`QR code to enrol this account's authenticator app. If you cannot scan it, enter this code manually instead: ${step.manualEntrySecret}`}
          width={256}
          height={256}
          unoptimized
          className="border border-surface-border"
        />
        <details>
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Can&apos;t scan the code? Enter it manually
          </summary>
          <p className="mt-2 break-all font-mono text-sm text-muted">
            {step.manualEntrySecret}
          </p>
        </details>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          Save these backup codes somewhere safe
        </p>
        <p className="text-sm text-muted">
          Each code can be used once to sign in if you lose access to your
          authenticator app. They are shown only once and cannot be
          retrieved again.
        </p>
        <ul className="flex flex-col gap-1 border border-surface-border bg-surface p-4 font-mono text-sm text-foreground">
          {step.backupCodes.map((backupCode) => (
            <li key={backupCode}>{backupCode}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleConfirm} className="flex flex-col gap-3">
        <label htmlFor={codeId} className="text-sm font-medium text-foreground">
          Enter the 6-digit code from your authenticator app to finish
        </label>
        <input
          id={codeId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={confirmCode}
          onChange={(event) => setConfirmCode(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 border border-surface-border bg-background px-3 text-base tracking-widest text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={isLoading || confirmCode.length === 0}
          className="min-h-11 cursor-pointer self-start border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Confirming…" : "Confirm and enable"}
        </button>
      </form>
    </div>
  );
}
