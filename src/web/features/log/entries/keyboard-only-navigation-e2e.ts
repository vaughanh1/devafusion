import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "keyboard-only-navigation-e2e",
  date: "2026-09-18",
  title: "Added a real keyboard-only navigation E2E spec (Tab/Enter, not just axe-core)",
  summary:
    "Checked as requested whether a user could navigate a form, select/enter, and submit using only Tab and Enter. axe-core (accessibility.spec.ts) only checks static/structural WCAG rules - an element is reachable, has a visible focus indicator, isn't a negative-tabindex trap - it never actually drives a keyboard through a real form. Confirmed no test anywhere in the codebase called page.keyboard.press at all. Added keyboard-navigation.spec.ts, which does: real Tab/type/Enter against sign-up, log-in, and reset-password, run against the real built app.",
  tags: ["accessibility", "typescript"],
  decisions: [
    "Each field walk starts from an explicit .focus() on the field itself rather than counting a fixed number of Tab presses from page load - an early version counting from page load broke on the first assertion because a header/nav link is focused before the form, a layout detail this spec should not be coupled to. WCAG SC 2.4.3 only requires the sequence AFTER a field is reached to be logical, which this proves without that coupling.",
    "The Enter-actually-submits proof runs against reset-password-form.tsx (no Cloudflare Turnstile dependency), not sign-up/log-in - Turnstile's own background round trip was observed as flaky in this session's own sandbox even with the documented dummy always-passes key (confirmed by re-running the pre-existing, unrelated sign-up.spec.ts Turnstile test in the same sandbox and seeing the identical failure), and that flakiness is already covered elsewhere by sign-up.spec.ts's own test. The sign-up/log-in tests in this new spec stop at proving tab order, deliberately not coupled to that separate flakiness.",
  ],
  milestones: [
    "tests-e2e/keyboard-navigation.spec.ts: 3 real Playwright tests (@a11y tag) - sign-up and log-in field tab-order, and a full reset-password Tab-through-and-Enter-submits proof against a real running server.",
    "Documented in src/web/__tests__/AGENTS.md alongside accessibility.spec.ts's existing @a11y documentation.",
  ],
  validation: [
    "Ran for real against a real built app (npm run build + npm run start) with the real dummy Turnstile/timing-token fixtures: all 3 tests passed.",
    "Confirmed the sign-up/log-in Turnstile-dependent path (not used by this spec's own assertions) fails identically for the pre-existing sign-up.spec.ts test in the same sandbox run, ruling out this spec's own logic as the cause before working around it.",
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 254 passed, 0 failed across 42 files - unaffected (this is a Playwright E2E addition, not a Vitest unit test).",
  ],
  visibility: "public",
};
