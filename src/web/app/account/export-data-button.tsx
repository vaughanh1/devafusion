"use client";

import { useState } from "react";

import { FormError } from "@/components/auth/form-error";

export function ExportDataButton() {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setError(null);
    setIsExporting(true);

    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        setError("Could not export your data. Please try again.");
        setIsExporting(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "devafusion-account-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <FormError message={error} />}
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="min-h-[var(--touch-target-size)] cursor-pointer self-start border border-surface-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? "Preparing…" : "Download my data"}
      </button>
    </div>
  );
}
