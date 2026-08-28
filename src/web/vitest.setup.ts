import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";

// Absolute isolation of test state between cases, per
// src/web/__tests__/AGENTS.md — no test may inherit cookies, storage, or
// DOM attributes left behind by a previous one.
afterEach(() => {
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  });

  window.localStorage.clear();
  document.documentElement.removeAttribute("data-a11y-theme");
  document.documentElement.removeAttribute("data-a11y-scale");
});
