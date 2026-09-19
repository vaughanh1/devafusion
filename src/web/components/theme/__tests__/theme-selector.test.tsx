import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  clearCookie,
  isA11yScale,
  isA11yTarget,
  isA11yTheme,
  readCookie,
  ThemeSelector,
  writeCookie,
} from "@/components/theme/theme-selector";

describe("isA11yTheme", () => {
  it("accepts every documented theme token", () => {
    expect(isA11yTheme("obsidian")).toBe(true);
    expect(isA11yTheme("editorial")).toBe(true);
    expect(isA11yTheme("tactical")).toBe(true);
  });

  it("rejects unknown or null values", () => {
    expect(isA11yTheme("midnight")).toBe(false);
    expect(isA11yTheme(null)).toBe(false);
    expect(isA11yTheme("")).toBe(false);
  });
});

describe("isA11yScale", () => {
  it("accepts every documented scale token", () => {
    expect(isA11yScale("normal")).toBe(true);
    expect(isA11yScale("large")).toBe(true);
    expect(isA11yScale("accessible-xl")).toBe(true);
  });

  it("rejects unknown or null values", () => {
    expect(isA11yScale("huge")).toBe(false);
    expect(isA11yScale(null)).toBe(false);
  });
});

describe("isA11yTarget", () => {
  it("accepts both documented WCAG conformance-level tokens", () => {
    expect(isA11yTarget("aaa")).toBe(true);
    expect(isA11yTarget("aa")).toBe(true);
  });

  it("rejects unknown or null values", () => {
    expect(isA11yTarget("aaaa")).toBe(false);
    expect(isA11yTarget(null)).toBe(false);
    expect(isA11yTarget("")).toBe(false);
  });
});

describe("cookie string parsing", () => {
  it("round-trips a written cookie value through readCookie", () => {
    writeCookie("devafusion-a11y-theme", "tactical");

    expect(readCookie("devafusion-a11y-theme")).toBe("tactical");
  });

  it("decodes a URL-encoded cookie value", () => {
    document.cookie = "devafusion-a11y-scale=large%2Dxl; path=/";

    expect(readCookie("devafusion-a11y-scale")).toBe("large-xl");
  });

  it("returns null when the cookie key is absent", () => {
    expect(readCookie("devafusion-a11y-theme")).toBeNull();
  });

  it("distinguishes cookies sharing a common name prefix", () => {
    document.cookie = "devafusion-a11y-theme-extra=obsidian; path=/";

    expect(readCookie("devafusion-a11y-theme")).toBeNull();
  });

  it("removes a cookie via clearCookie", () => {
    writeCookie("devafusion-a11y-theme", "editorial");
    expect(readCookie("devafusion-a11y-theme")).toBe("editorial");

    clearCookie("devafusion-a11y-theme");

    expect(readCookie("devafusion-a11y-theme")).toBeNull();
  });
});

// Regression coverage for a real WCAG 2.2 SC 4.1.2 (Name, Role, Value)
// gap: this control used to be a native <details>/<summary> with no
// way to flip its own trigger's visible label the way
// main-navigation.tsx's mobile menu button already does ("Menu" ->
// "Close"). Confirms the same pattern now applies here too.
describe("ThemeSelector open/close control", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows 'Accessibility' collapsed, with aria-expanded false", () => {
    render(<ThemeSelector />);

    const trigger = screen.getByRole("button", { name: "Accessibility" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("flips to 'Close' and aria-expanded true once opened, and back again", () => {
    render(<ThemeSelector />);

    const trigger = screen.getByRole("button", { name: "Accessibility" });
    fireEvent.click(trigger);

    const closeTrigger = screen.getByRole("button", { name: "Close" });
    expect(closeTrigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(closeTrigger);

    expect(
      screen.getByRole("button", { name: "Accessibility" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("links to the /accessibility explainer page once opened", () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Accessibility" }));

    expect(
      screen.getByRole("link", { name: /learn what these do/i }),
    ).toHaveAttribute("href", "/accessibility");
  });
});
