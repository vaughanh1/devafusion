import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "accessibility-aaa-audit-and-explainer-page",
  date: "2026-09-19",
  title: "WCAG 2.2 AAA audit, a new /accessibility explainer page, and three real UX fixes",
  summary:
    "Audited this site's accessibility controls (colour theme, text size, touch-target size) against the full WCAG 2.2 spec, publishing an honest /accessibility page mapping each control to its success criterion and stating plainly where the site does and does not meet the strictest (AAA) level - including two genuinely un-met criteria (3.3.9, 1.4.8) and two documented security-driven exceptions (2.2.3/2.2.6, 2.2.5). Alongside the audit, fixed three real defects the review surfaced: ThemeSelector's disclosure control never changed its own label between open/closed states, three password fields across the account/MFA settings had no show/hide toggle unlike every other password field on the site, and the footer's two reference links (Privacy & cookies, and the new Accessibility page) needed a consistent, explicitly-labelled group rather than an ad hoc mix of underlined/non-underlined styling.",
  tags: ["accessibility", "wcag", "ux"],
  decisions: [
    "ThemeSelector converted from a native <details>/<summary> to the same controlled aria-expanded button pattern MainNavigation's mobile menu already uses (\"Menu\" -> \"Close\") - a native <details> has no way to flip its own trigger's visible label, only its native open/closed role, closing a real WCAG 2.2 SC 4.1.2 (Name, Role, Value) gap. Renamed the trigger from \"Theme\" to \"Accessibility\" since the panel covers touch-target size and text size too, not only colour.",
    "Swapped three raw <input type=\"password\"> fields (totp-enrolment.tsx's re-enrolment password, mfa-settings-dashboard.tsx's settings-save password, delete-account-form.tsx's confirmation password) for the shared PasswordField component every other password field on the site already uses - a plain mechanical consistency fix, not a new component.",
    "Deliberately did NOT add a second 'confirm password' field to sign-up/reset-password, after being asked directly whether that omission was ever a considered choice - it wasn't stated at the time it was built, so it's now documented explicitly on /accessibility: WCAG 2.2 SC 3.3.7 (Redundant Entry, new in 2.2, Level AA) discourages asking for the same value twice, and the existing PasswordField show/hide toggle is the standard alternative that lets a user verify what they typed without retyping it.",
    "Footer's Privacy & cookies and the new Accessibility link are grouped under a labelled <nav aria-label=\"Legal\"> with identical underline styling, resolving a real found inconsistency (Privacy & cookies was underlined, Contact was not, for no stated reason) - Contact deliberately keeps its own plain nav-link styling since it is a destination, not a reference/compliance link, a real distinction now stated rather than an accident.",
    "Chose a footer-grouped placement for /accessibility over adding it to the main top-level nav, specifically to avoid the clutter concern raised directly: secondary/compliance links (Legal, Accessibility, and any future page in this category) belong in a labelled footer group, matching common practice on large sites, rather than growing the primary nav or an already-dense ThemeSelector panel - this scales better on narrow mobile viewports where nav space is scarcest.",
    "Button colour consistency (bg-accent blue vs neutral bg-surface across Verify/Save/Confirm vs Set-up/Download/Delete-account) was raised and confirmed as a real defect - the 'Permanently delete my account' button currently looks no more severe than 'Download my data' - but deliberately deferred to a follow-up slice, not bundled into this one, per explicit direction to prioritise an unrelated live sign-up lockout issue first.",
  ],
  milestones: [
    "src/web/app/accessibility/page.tsx (new): explains all three controls in plain English, states plainly what AA vs AAA means on this site, documents all 18 theme x scale x target combinations, and publishes a full WCAG 2.2 AAA assessment table (1.4.6, 1.4.8, 2.2.3/2.2.6, 2.2.5, 2.5.5, 3.3.7, 3.3.8, 3.3.9) with an honest met/not-met/exception status and reasoning for each.",
    "src/web/components/theme/theme-selector.tsx: controlled aria-expanded button replacing native <details>, renamed trigger, added an in-panel plain-language note distinguishing what AAA touch-target does NOT change (colour, text size), and a link to /accessibility.",
    "src/web/components/account/totp-enrolment.tsx, mfa-settings-dashboard.tsx, app/account/delete-account-form.tsx: swapped raw password inputs for the shared PasswordField component.",
    "src/web/components/layout/site-footer.tsx: added a labelled 'Legal' nav group (Privacy & cookies + Accessibility) with consistent underline styling.",
    "src/web/app/legal/page.tsx: added a cross-link to the new /accessibility page.",
    "src/web/app/sitemap.ts + app/__tests__/sitemap.test.ts: added the new /accessibility route.",
    "src/web/AGENTS.md: added four new checklist items covering the disclosure-label gap, SC 2.4.11 (no automated coverage exists), SC 3.3.8/3.3.9 assessment, and SC 2.2.3/2.2.6's documented MFA-timeout exception.",
    "src/web/__tests__/AGENTS.md: rewrote the visual-regression baseline bootstrap instructions after hitting two real, time-costing failures live in this session (a Windows-built standalone bundle mounted into the Linux container fails with a platform-specific native-module hash mismatch; splitting npm ci and the test run across two separate docker run invocations silently loses the anonymous node_modules volume) - the corrected instructions run npm ci, build, and the test together in one container invocation, with the exact CI fixture env vars proxy.ts's auth.api.getSession() call now requires.",
  ],
  validation: [
    "npx tsc --noEmit and npx eslint --max-warnings 0 both pass clean.",
    "npm run test:unit: 270 passed, 0 failed across 43 files, including new ThemeSelector open/close/aria-expanded regression tests.",
    "npm run build succeeds; /accessibility is generated as a fully static route, same as every other content page, confirming no regression to static generation.",
    "Ran the real pinned Playwright Docker image (mcr.microsoft.com/playwright:v1.62.1-noble) end-to-end - npm ci, build, and the @visual-tagged spec together in one container invocation - against the footer change: home-layout.visual.spec.ts's committed baseline still passes with no new diff.",
  ],
  visibility: "public",
};

