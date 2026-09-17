"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

// ADR-0014: mirrors theme-selector.tsx's own cookie-read helpers
// exactly (readCookie, the "storage" event re-notify pattern) rather
// than importing that module directly, since this widget only needs
// the read side, not the write/UI side.
const THEME_COOKIE_KEY = "devafusion-a11y-theme";

// Named accessibility profiles with a dark background (globals.css:
// obsidian and tactical both set --background to a near-black value;
// editorial is light). Turnstile's public widget API only exposes
// light/dark/auto - there is no equivalent of a third custom palette,
// so a high-contrast profile like tactical still only gets Turnstile's
// stock "dark" chrome, not a true tactical-matched render. This is a
// documented, accepted limitation (docs/adr/0014), not an oversight.
const DARK_A11Y_THEMES = new Set(["obsidian", "tactical"]);

function readThemeCookie(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribeToThemeCookie(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getServerSnapshot() {
  return null;
}

// Resolves the site's own explicit theme choice to Turnstile's
// light/dark/auto vocabulary. No cookie set (the "System" default) or
// an unrecognised value both fall back to "auto" - the same
// prefers-color-scheme-driven behaviour this site's own unset-theme
// default already uses (globals.css's @media (prefers-color-scheme:
// dark) block).
export function resolveTurnstileTheme(
  a11yTheme: string | null,
): "light" | "dark" | "auto" {
  if (a11yTheme === null) return "auto";
  if (DARK_A11Y_THEMES.has(a11yTheme)) return "dark";
  if (a11yTheme === "editorial") return "light";
  return "auto";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "flexible" | "compact";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export type TurnstileWidgetHandle = {
  reset: () => void;
};

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  // ADR-0014: a Turnstile token is single-use and expires after 300
  // seconds (Cloudflare's own documented limits) - a form that
  // silently passed the widget early (Managed mode's common "low
  // risk, no interaction needed" outcome) and then fails submission
  // for ANY reason (wrong password, duplicate email, a slow typist)
  // is left holding that same spent/stale token on retry, which
  // Cloudflare's siteverify rejects with timeout-or-duplicate -
  // surfaced to the visitor as a confusing generic "Captcha
  // verification failed", even though nothing about their retry was
  // actually a captcha problem. handleRef exposes reset() so every
  // calling form can request a fresh challenge in its own failure
  // branches, rather than only on a captcha-specific error.
  handleRef?: React.RefObject<TurnstileWidgetHandle | null>;
};

// ADR-0014: Cloudflare Turnstile, Managed mode, explicit rendering (this
// is a client-rendered form, not a static page present at initial load
// - Cloudflare's own docs recommend explicit over implicit rendering for
// exactly this case). Hand-rolled rather than the community
// @marsidev/react-turnstile package - Turnstile's own client contract is
// a single script tag plus a render() call, not enough surface to
// justify a new npm dependency (root AGENTS.md, Standardized Tooling).
// next/script (not a raw <script> tag) per src/web/AGENTS.md's No Raw
// Script Tags rule - the one documented exception there is the
// accessibility flash-prevention script, which this is not, so it
// goes through next/script like every other third-party script load.
export function TurnstileWidget({ onToken, handleRef }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const containerId = useId();

  // Same useSyncExternalStore pattern as theme-selector.tsx and
  // cookie-banner.tsx (src/web/AGENTS.md's Hydration-Safe Client Reads
  // rule) - document.cookie writes don't fire a native change event,
  // so ThemeSelector's own handlers dispatch a synthetic "storage"
  // event on every theme change, which this subscribes to as well.
  const a11yTheme = useSyncExternalStore(
    subscribeToThemeCookie,
    readThemeCookie,
    getServerSnapshot,
  );
  const turnstileTheme = resolveTurnstileTheme(a11yTheme);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile) return;

    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!sitekey) {
      console.error(
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set - Turnstile widget cannot render.",
      );
      return;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey,
      callback: (token) => onToken(token),
      "error-callback": () => onToken(null),
      "expired-callback": () => onToken(null),
      theme: turnstileTheme,
      // ADR-0014: Turnstile's default size ("normal") is a fixed
      // ~300px width that can overflow a narrow mobile viewport or
      // sit awkwardly inside this form's fluid max-w-md container.
      // "flexible" is Cloudflare's own documented responsive mode -
      // the widget fills its container's width instead, matching how
      // every other field in this form already behaves.
      size: "flexible",
      // ADR-0014 (reversed after live use): "interaction-only" was
      // tried first to keep the form visually clean for the silent-
      // pass case, but that left a real gap - on a desktop visitor
      // Managed mode judges low-risk, the submit button sits
      // disabled for the ~2-5 seconds the background check takes
      // with absolutely nothing on screen explaining why, which
      // reads as a broken/frozen page rather than "a check is
      // running". Cloudflare's own default, "always", shows the
      // widget/spinner from page load in every case, so there is
      // always visible feedback - the one real cost (a checkbox
      // placeholder is visible even on the common silent-pass path)
      // is a smaller UX problem than an unexplained frozen button.
      appearance: "always",
    });

    if (handleRef) {
      handleRef.current = {
        reset: () => {
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        },
      };
    }

    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      if (handleRef) handleRef.current = null;
    };
    // onToken is a stable setState-style callback and handleRef is a
    // stable ref object, both deliberately excluded from this
    // effect's deps; turnstileTheme
    // IS included - Turnstile's render() has no live theme-update API,
    // so the only way to reflect a mid-session theme change is to tear
    // down and re-render the widget, which does restart the visitor's
    // challenge. Accepted trade-off: correct-looking widget over
    // preserving an in-flight challenge across a theme switch, which
    // should be rare mid-form-fill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, turnstileTheme]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div id={containerId} ref={containerRef} />
    </>
  );
}
