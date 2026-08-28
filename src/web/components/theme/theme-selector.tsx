"use client";

import { useCallback, useSyncExternalStore } from "react";

type A11yTheme = "obsidian" | "editorial" | "tactical";
type A11yScale = "normal" | "large" | "accessible-xl";

const THEME_COOKIE_KEY = "devafusion-a11y-theme";
const SCALE_COOKIE_KEY = "devafusion-a11y-scale"; // gitleaks:allow -- public cookie name, not a secret; documented on /legal
const THEME_ATTRIBUTE = "data-a11y-theme";
const SCALE_ATTRIBUTE = "data-a11y-scale";

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

function isA11yTheme(value: string | null): value is A11yTheme {
  return (
    value === "obsidian" || value === "editorial" || value === "tactical"
  );
}

function isA11yScale(value: string | null): value is A11yScale {
  return value === "normal" || value === "large" || value === "accessible-xl";
}

function readCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(key: string, value: string) {
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function clearCookie(key: string) {
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

  const activeTheme = isA11yTheme(storedTheme) ? storedTheme : null;
  const activeScale = isA11yScale(storedScale) ? storedScale : "normal";

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

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:gap-6">
      <fieldset className="flex items-center gap-2">
        <legend className="sr-only">Colour theme</legend>
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={activeTheme === option.value}
            onClick={() => handleThemeChange(option.value)}
            className={`min-h-11 border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
          className="min-h-11 border border-surface-border px-3 text-xs font-medium text-muted transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`min-h-11 border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              activeScale === option.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-surface-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
