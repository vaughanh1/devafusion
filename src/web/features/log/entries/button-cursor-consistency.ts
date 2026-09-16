import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "button-cursor-consistency",
  date: "2026-09-16",
  title: "Consistent hand cursor across every native button, matching links",
  summary:
    "Native <button> elements across the app (Log out, Download my data, Log in, Create account, and every other button-styled control) showed the browser's default cursor rather than a hand cursor, while visually identical <Link>/<a> elements right next to them (e.g. Account, Log in) already got a hand cursor for free from the browser's default anchor styling. Tailwind v4 removed the old preflight rule that set cursor: pointer on buttons, so every native button in this app had silently inherited an inconsistent default. Added an explicit cursor-pointer class to every native button so its affordance matches links.",
  tags: ["bugfix", "accessibility", "ui"],
  decisions: [
    "Added cursor-pointer directly on each button's own className rather than a global CSS rule targeting the button element, to stay consistent with this codebase's existing pattern of styling every interactive element inline via Tailwind utility classes rather than bare-selector CSS in globals.css.",
    "Left disabled:cursor-not-allowed untouched on every button that already had it - Tailwind's disabled: variant is applied after the base cursor-pointer class in the same className string, so it continues to correctly override the pointer cursor whenever the disabled attribute is set.",
  ],
  milestones: [
    "Added cursor-pointer to every native <button> across account-nav.tsx, export-data-button.tsx, log-in-form.tsx, sign-up-form.tsx, reset-password-form.tsx, forget-password-form.tsx, delete-account-form.tsx, password-field.tsx, main-navigation.tsx, cookie-banner.tsx, and theme-selector.tsx (both the colour-theme and text-size option buttons).",
  ],
  validation: [
    "npm run typecheck and npm run lint both pass clean.",
    "npm run test:unit - all 82 existing tests pass unchanged, since cursor is a non-functional CSS property and no test asserts against className strings.",
    "Not run against the Docker-pinned Playwright visual regression suite: cursor is a pointer-interaction CSS property with no effect on rendered pixel output, so it cannot change any toHaveScreenshot() baseline.",
  ],
  visibility: "public",
};
