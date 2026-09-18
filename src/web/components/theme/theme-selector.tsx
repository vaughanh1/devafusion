"use client";

import { useCallback, useSyncExternalStore } from "react";

type A11yTheme = "obsidian" | "editorial" | "tactical";
type A11yScale = "normal" | "large" | "accessible-xl";
// WCAG 2.2 conformance level for touch-target sizing
// (src/web/AGENTS.md's "What compliant actually requires you to do"
// section) - "aa" (24px, SC 2.5.8 Target Size Minimum) is the
// default: the widely accepted global legal/regulatory baseline for
// digital accessibility. "aaa" (44px, SC 2.5.5 Target Size Enhanced)
// is an explicit opt-UP for a visitor who wants the stricter,
// showcase-tier bar - never the reverse; the site meets AA by
// default and a user chooses to go further, not the other way round.
type A11yTarget = "aa" | "aaa";

const THEME_COOKIE_KEY = "devafusion-a11y-theme";
const SCALE_COOKIE_KEY = "devafusion-a11y-scale"; // gitleaks:allow -- public cookie name, not a secret; documented on /legal
const TARGET_COOKIE_KEY = "devafusion-a11y-target";
const THEME_ATTRIBUTE = "data-a11y-theme";
const SCALE_ATTRIBUTE = "data-a11y-scale";
const TARGET_ATTRIBUTE = "data-a11y-target";

const THEME_OPTIONS: ReadonlyArray<{ value: A11yTheme; label: string }> = [
  { value: "obsidian", label: "Obsidian" },
  { value: "editorial", label: "Editorial" },
  { value: "tactical", label: "Tactical" },
];

const SCALE_OPTIONS: ReadonlyArray<{ value: A11yScale; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "accessible-xl", label: "Accessible XL" },
];

const TARGET_OPTIONS: ReadonlyArray<{ value: A11yTarget; label: string }> = [
  { value: "aa", label: "AA (24px)" },
  { value: "aaa", label: "AAA (44px)" },
];

// Exported for unit coverage of the theme token selection and cookie
// string parsing formulas (src/web/__tests__/AGENTS.md) — these are pure
// functions with no DOM/React dependency beyond document.cookie itself.
export function isA11yTheme(value: string | null): value is A11yTheme {
  return (
    value === "obsidian" || value === "editorial" || value === "tactical"
  );
}

export function isA11yScale(value: string | null): value is A11yScale {
  return value === "normal" || value === "large" || value === "accessible-xl";
}

export function isA11yTarget(value: string | null): value is A11yTarget {
  return value === "aaa" || value === "aa";
}

export function readCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function writeCookie(key: string, value: string) {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function clearCookie(key: string) {
  document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
}

// document.cookie writes do not fire the "storage" event, so this local
// store is notified manually — same pattern as cookie-banner.tsx.
function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getThemeSnapshot() {
  return readCookie(THEME_COOKIE_KEY);
}

function getScaleSnapshot() {
  return readCookie(SCALE_COOKIE_KEY);
}

function getTargetSnapshot() {
  return readCookie(TARGET_COOKIE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function ThemeSelector() {
  const storedTheme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerSnapshot,
  );
  const storedScale = useSyncExternalStore(
    subscribe,
    getScaleSnapshot,
    getServerSnapshot,
  );
  const storedTarget = useSyncExternalStore(
    subscribe,
    getTargetSnapshot,
    getServerSnapshot,
  );

  const activeTheme = isA11yTheme(storedTheme) ? storedTheme : null;
  const activeScale = isA11yScale(storedScale) ? storedScale : "normal";
  // Defaults to "aa" (24px), matching globals.css's own :root
  // --touch-target-size default that applies with no cookie set -
  // AA is the baseline every visitor gets; AAA is only ever an
  // explicit opt-up.
  const activeTarget = isA11yTarget(storedTarget) ? storedTarget : "aa";

  const handleThemeChange = useCallback((value: A11yTheme) => {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, value);
    writeCookie(THEME_COOKIE_KEY, value);
    window.dispatchEvent(new Event("storage"));
  }, []);

  const handleThemeReset = useCallback(() => {
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    clearCookie(THEME_COOKIE_KEY);
    window.dispatchEvent(new Event("storage"));
  }, []);

  const handleScaleChange = useCallback((value: A11yScale) => {
    document.documentElement.setAttribute(SCALE_ATTRIBUTE, value);
    writeCookie(SCALE_COOKIE_KEY, value);
    window.dispatchEvent(new Event("storage"));
  }, []);

  const handleTargetChange = useCallback((value: A11yTarget) => {
    document.documentElement.setAttribute(TARGET_ATTRIBUTE, value);
    writeCookie(TARGET_COOKIE_KEY, value);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return (
    <details className="relative text-sm">
      <summary className="min-h-[var(--touch-target-size)] list-none inline-flex cursor-pointer items-center border border-surface-border px-3 text-xs font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Theme
      </summary>

      <div className="absolute right-0 bottom-full z-10 mb-2 flex w-max flex-col gap-3 border border-surface-border bg-surface p-3 shadow-lg">
      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Colour theme</legend>
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={activeTheme === option.value}
            onClick={() => handleThemeChange(option.value)}
            className={`min-h-[var(--touch-target-size)] cursor-pointer border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              activeTheme === option.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleThemeReset}
          disabled={activeTheme === null}
          className="min-h-[var(--touch-target-size)] cursor-pointer border border-surface-border px-3 text-xs font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          System
        </button>
      </fieldset>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Text size</legend>
        {SCALE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={activeScale === option.value}
            onClick={() => handleScaleChange(option.value)}
            className={`min-h-[var(--touch-target-size)] cursor-pointer border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              activeScale === option.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Touch target size (WCAG conformance level)</legend>
        {TARGET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={activeTarget === option.value}
            onClick={() => handleTargetChange(option.value)}
            className={`min-h-[var(--touch-target-size)] cursor-pointer border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              activeTarget === option.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
      </div>
    </details>
  );
}
