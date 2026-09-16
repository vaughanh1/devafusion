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
    };
  }
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
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
export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
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
      // ADR-0014: Cloudflare's default ("always") renders the widget
      // container visibly from page load, even before Managed mode
      // has decided whether an interactive checkbox is actually
      // needed - every visitor sees widget UI regardless of outcome.
      // "interaction-only" keeps the form visually clean for the
      // (likely common) silent-pass case, only showing the checkbox
      // when Managed mode genuinely escalates to one - no change to
      // the underlying verification logic, purely a UX improvement.
      appearance: "interaction-only",
    });

    return () => {
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
    };
    // onToken is a stable setState-style callback from the parent
    // form, deliberately excluded from this effect's deps; turnstileTheme
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
