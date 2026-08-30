import { describe, expect, it } from "vitest";

import {
  clearCookie,
  isA11yScale,
  isA11yTheme,
  readCookie,
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
