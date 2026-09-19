import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "account-nav-stuck-logging-out-after-relogin",
  date: "2026-09-19",
  title: "Fixed a real production lockout: the header's Log out button stuck forever after re-login",
  summary:
    "A user reported being unable to log out at all after setting their second factor to 'None' and signing back in: the header's Log out button stayed permanently disabled, reading 'Logging out…'. Root cause was in AccountNav, not MFA or the new otpauth:// deep link initially suspected: it is rendered from the root layout, so it is never unmounted across a client-side log-out -> /log-in -> log-back-in round trip (Better Auth's own client and this project's login-step1 route both navigate via router.push, not a full page reload). Its isLoggingOut state was set to true on sign-out and never reset back to false anywhere, so it stayed stuck on the very next login on that same tab, permanently disabling the button. Reproduced live with a real headed (non-headless) Playwright run before writing the fix, and again to confirm the fix actually resolves it.",
  tags: ["auth", "bug", "react", "testing"],
  decisions: [
    "Initially suspected the wrong cause from a browser console screenshot showing 'Failed to launch otpauth://... because the scheme does not have a registered handler' at mfa-setup - fixed that real (but unrelated) issue too by adding target=\"_blank\"/rel=\"noopener\" to the deep link, but a live-question-and-answer exchange with the reporting user (asking exactly when the stuck state appeared - immediately after login, not on clicking Log out) redirected the investigation to the actual cause. Both fixes are real and kept, but only the AccountNav one addresses the reported symptom.",
    "A first headless Playwright repro attempt failed to reproduce anything, and a second headed attempt using page.goto() between steps also failed to reproduce the bug - page.goto() performs a full browser navigation, which remounts every component from scratch and destroys the exact stale-state condition being tested. Only a repro that clicks <Link>s for every navigation step (matching what a real user's mouse clicks do, and what router.push already does server-side) actually reproduced it - confirmed by reproducing the same failure against the unmodified pre-fix code, then confirming it disappears with the fix applied, run twice.",
    "The fix resets isLoggingOut specifically on the false-to-true transition of session presence (a genuine fresh login), tracked via a useRef, rather than on every render where a session is already present - resetting unconditionally on any truthy session would defeat the loading state while a sign-out is still genuinely in flight, since authClient's session store can stay momentarily stale/truthy immediately after signOut() is called and before its own $sessionSignal listener catches up.",
  ],
  milestones: [
    "src/web/components/navigation/account-nav.tsx: added a useEffect + useRef pair resetting isLoggingOut to false on a genuine new-session transition.",
    "src/web/components/navigation/__tests__/account-nav.test.tsx: added a regression test simulating the full sign-out -> logged-out -> fresh-login re-render sequence on the same mounted instance, confirmed to fail against the pre-fix code and pass against the fix.",
    "src/web/components/account/totp-enrolment.tsx: separately fixed the otpauth:// deep link to open in a new browsing context (target=\"_blank\" rel=\"noopener\") rather than the current tab, since a same-tab navigation attempt to an unregistered custom scheme is a real (if not, in the end, root-cause) failure mode worth closing.",
  ],
  validation: [
    "npx tsc --noEmit and npm run test:unit (267 passed, 0 failed across 43 files) both pass clean.",
    "Reproduced the exact reported lockout live against a real local Postgres with a headed (non-headless) Playwright script clicking through sign-up, email verification, choosing 'None' as the second factor, logging out, and logging back in on the same browser tab - the Log out button was confirmed stuck disabled on 'Logging out…' against the pre-fix code, and confirmed working (enabled, reading 'Log out') against the fix, run twice for stability.",
    "Husky pre-commit hook (gitleaks + lint + typecheck) passed on this commit.",
  ],
  visibility: "public",
};
