import { describe, expect, it } from "vitest";

import { resolveTurnstileTheme } from "@/components/auth/turnstile-widget";

// ADR-0014: pure mapping logic from this site's own three named
// accessibility profiles (globals.css) to Turnstile's light/dark/auto
// vocabulary - covered directly since Turnstile's public API has no
// fourth "custom palette" option and getting this mapping wrong would
// silently mismatch the widget against the rest of the page.
describe("resolveTurnstileTheme", () => {
  it("maps obsidian (dark background) to dark", () => {
    expect(resolveTurnstileTheme("obsidian")).toBe("dark");
  });

  it("maps tactical (dark background) to dark", () => {
    expect(resolveTurnstileTheme("tactical")).toBe("dark");
  });

  it("maps editorial (light background) to light", () => {
    expect(resolveTurnstileTheme("editorial")).toBe("light");
  });

  it("falls back to auto when no theme cookie is set (the System default)", () => {
    expect(resolveTurnstileTheme(null)).toBe("auto");
  });

  it("falls back to auto for an unrecognised theme value", () => {
    expect(resolveTurnstileTheme("midnight")).toBe("auto");
  });
});
