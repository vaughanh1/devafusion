"use client";

import { sendGAEvent } from "@next/third-parties/google";
import Link from "next/link";
import { useCallback, useEffect, useSyncExternalStore } from "react";

type ConsentChoice = "granted" | "denied";

const CONSENT_STORAGE_KEY = "devafusion-cookie-consent";

function isConsentChoice(value: string | null): value is ConsentChoice {
  return value === "granted" || value === "denied";
}

// localStorage is read as an external store so the client and server render
// the same shell on first paint; the client re-syncs once storage is readable.
function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getSnapshot() {
  return window.localStorage.getItem(CONSENT_STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

function applyConsent(choice: ConsentChoice) {
  sendGAEvent("consent", "update", {
    analytics_storage: choice,
  });
}

export function CookieBanner() {
  const storedChoice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (isConsentChoice(storedChoice)) {
      applyConsent(storedChoice);
    }
  }, [storedChoice]);

  const handleChoice = useCallback((choice: ConsentChoice) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    applyConsent(choice);
    // Same-tab writes do not fire the "storage" event, so notify manually.
    window.dispatchEvent(new Event("storage"));
  }, []);

  if (isConsentChoice(storedChoice)) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white px-6 py-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          This site uses Google Analytics to understand traffic. See the{" "}
          <Link href="/legal" className="underline hover:text-zinc-950">
            privacy and cookies page
          </Link>{" "}
          for details.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleChoice("denied")}
            className="min-h-11 flex-1 border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-950 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleChoice("granted")}
            className="min-h-11 flex-1 bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
