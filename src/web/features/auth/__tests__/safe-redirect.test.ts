import { describe, expect, it } from "vitest";

import {
  isSafeRedirectPath,
  resolveSafeRedirectPath,
} from "@/features/auth/safe-redirect";

describe("isSafeRedirectPath", () => {
  it("accepts a plain internal path", () => {
    expect(isSafeRedirectPath("/log")).toBe(true);
  });

  it("accepts an internal path with a query string", () => {
    expect(isSafeRedirectPath("/projects?filter=active")).toBe(true);
  });

  it("rejects null", () => {
    expect(isSafeRedirectPath(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeRedirectPath(undefined)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeRedirectPath("")).toBe(false);
  });

  it("rejects an absolute URL with a scheme", () => {
    expect(isSafeRedirectPath("https://evil.example.com")).toBe(false);
  });

  it("rejects a bare hostname with no scheme", () => {
    expect(isSafeRedirectPath("evil.example.com")).toBe(false);
  });

  it("rejects a protocol-relative URL", () => {
    expect(isSafeRedirectPath("//evil.example.com")).toBe(false);
  });

  it("rejects a javascript: scheme disguised with a leading slash", () => {
    expect(isSafeRedirectPath("/javascript:alert(1)")).toBe(false);
  });

  it("rejects a javascript: scheme with leading whitespace", () => {
    expect(isSafeRedirectPath("/ javascript:alert(1)")).toBe(false);
  });
});

describe("resolveSafeRedirectPath", () => {
  it("returns the value when it is a safe path", () => {
    expect(resolveSafeRedirectPath("/log")).toBe("/log");
  });

  it("returns the fallback when the value is undefined", () => {
    expect(resolveSafeRedirectPath(undefined)).toBe("/");
  });

  it("returns the fallback when the value is unsafe", () => {
    expect(resolveSafeRedirectPath("https://evil.example.com")).toBe("/");
  });

  it("returns a custom fallback when provided", () => {
    expect(resolveSafeRedirectPath(undefined, "/account")).toBe("/account");
  });

  it("takes the first entry when the value is an array", () => {
    expect(resolveSafeRedirectPath(["/log", "/projects"])).toBe("/log");
  });

  it("falls back when the first array entry is unsafe", () => {
    expect(resolveSafeRedirectPath(["https://evil.example.com"])).toBe("/");
  });
});
