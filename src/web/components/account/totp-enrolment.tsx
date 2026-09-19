"use client";

import Image from "next/image";
import { useId, useState } from "react";

import { FormError } from "@/components/auth/form-error";

type EnrolmentStep =
  | { stage: "idle" }
  // Surfaced when /api/auth/two-factor/enrol reports this account
  // already has a confirmed TOTP factor and needs the current
  // password re-confirmed before replacing it - e.g. recovering from
  // a lost/reset authenticator device, not this component's first
  // run.
  | { stage: "needs-password" }
  | {
      stage: "scanning";
      qrCodeDataUri: string;
      otpauthUri: string;
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
  const reenrolPasswordId = useId();

  const [step, setStep] = useState<EnrolmentStep>({ stage: "idle" });
  const [confirmCode, setConfirmCode] = useState("");
  const [reenrolPassword, setReenrolPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Shared by both the first-time and re-enrolment paths - the
  // server-side behaviour (and every response shape below) is
  // identical either way; only whether a password is required
  // differs, and the server itself is the one source of truth for
  // that (this account's stored twoFactorEnabled, not any client-
  // held state).
  async function startEnrolment(password?: string) {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/two-factor/enrol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { password } : {}),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);

        // The server's 400 for "password required" is the same
        // status a malformed request would also return - the two
        // are told apart by the specific message this route only
        // ever sends for that one case, not a dedicated status code,
        // since introducing a new one just for this single caller
        // would be a heavier change than reusing the existing 400 +
        // message the route already returns.
        if (
          response.status === 400 &&
          body?.error?.includes("current password is required")
        ) {
          setStep({ stage: "needs-password" });
          setIsLoading(false);
          return;
        }

        setError(body?.error ?? "Could not start enrolment. Please try again.");
        setIsLoading(false);
        return;
      }

      const body = await response.json();
      setStep({
        stage: "scanning",
        qrCodeDataUri: body.qrCodeDataUri,
        otpauthUri: body.otpauthUri,
        manualEntrySecret: body.manualEntrySecret,
        backupCodes: body.backupCodes,
      });
      setConfirmCode("");
      setIsLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
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
          onClick={() => startEnrolment()}
          disabled={isLoading}
          className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-surface-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Starting…" : "Set up authenticator app"}
        </button>
      </div>
    );
  }

  if (step.stage === "needs-password") {
    // A plain div, not a nested <form> - same reasoning as the
    // confirm-code step below: this component is always mounted
    // inside MfaSettingsDashboard's own outer <form>.
    return (
      <div className="flex flex-col gap-3">
        {error && <FormError id={errorId} message={error} />}
        <p className="text-sm text-muted">
          You already have an authenticator app set up. Confirm your password
          to replace it - useful if you&apos;ve lost access to the current
          one.
        </p>
        <label
          htmlFor={reenrolPasswordId}
          className="text-sm font-medium text-foreground"
        >
          Current password
        </label>
        <input
          id={reenrolPasswordId}
          type="password"
          name="reenrolPassword"
          autoComplete="current-password"
          required
          value={reenrolPassword}
          onChange={(event) => setReenrolPassword(event.target.value)}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="button"
          onClick={() => startEnrolment(reenrolPassword)}
          disabled={isLoading || reenrolPassword.length === 0}
          className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Confirming…" : "Confirm and replace authenticator app"}
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
        {/* Setting up on the same phone that would do the scanning
            has no camera free to scan with - a tappable otpauth://
            link, which most authenticator apps register as their own
            handler, lets that device open the app directly instead.
            target="_blank" is required, not cosmetic: a same-tab
            top-level navigation to an unregistered custom scheme
            leaves this page's own navigation context stuck (confirmed
            live - Chrome logs "Failed to launch '...' because the
            scheme does not have a registered handler" and the page's
            own subsequent fetch calls, e.g. signing out, silently
            never resolve). Opening in a new context means a failed
            launch only ever affects that discarded context, never
            this page. rel="noopener" is required alongside target=
            "_blank" per the standard reverse-tabnabbing mitigation -
            not that a custom-scheme link exposes window.opener to
            anything meaningfully exploitable here, but there is no
            reason to omit it. */}
        <a
          href={step.otpauthUri}
          target="_blank"
          rel="noopener"
          className="min-h-[var(--touch-target-size)] text-sm font-medium text-foreground underline decoration-muted underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Setting up on this device? Open in your authenticator app
        </a>
        <button
          type="button"
          onClick={() => startEnrolment()}
          disabled={isLoading}
          className="min-h-[var(--touch-target-size)] cursor-pointer self-start text-sm font-medium text-muted underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start over with a new QR code
        </button>
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

      {/* A plain div, not a nested <form> - this component is always
          mounted inside MfaSettingsDashboard's own outer <form>, and
          HTML forbids nested forms. A nested <form> here would submit
          the *outer* form on click (a full page reload, silently
          discarding this component's own state) instead of ever
          calling handleConfirm - exactly the failure this component's
          e2e coverage (tests-e2e/mfa-flow.spec.ts) caught. */}
      <div className="flex flex-col gap-3">
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
          aria-invalid={!!error}
          className="min-h-[var(--touch-target-size)] border border-surface-border bg-background px-3 text-base tracking-widest text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading || confirmCode.length === 0}
          className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Confirming…" : "Confirm and enable"}
        </button>
      </div>
    </div>
  );
}
