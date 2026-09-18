import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "accessibility-target-wcag-2-2",
  date: "2026-09-17",
  title: "Corrected accessibility.spec.ts's actual WCAG version scope from 2.1 to 2.2",
  summary:
    "accessibility.spec.ts's AxeBuilder call and its own test names/comments scoped the automated gate to WCAG 2.1 AA tags (wcag2a/wcag2aa/wcag21a/wcag21aa) while every other reference in this codebase (src/web/AGENTS.md's checklist, this branch's own touch-target work) states WCAG 2.2 as the actual target. Fixed by adding the wcag22aa tag (WCAG 2.2 introduced no new Level A criteria, so there is no wcag22a tag in the installed axe-core) and force-enabling axe-core's disabled-by-default target-size rule - the only wcag22aa-tagged rule, and the one rule that maps directly onto this project's own 24px AA touch-target floor.",
  tags: ["accessibility", "testing"],
  decisions: [
    "Confirmed against the W3C's own WCAG 2.2 Recommendation text - 'Content that conforms to WCAG 2.2 also conforms to WCAG 2.0 and WCAG 2.1' - that 2.2 is a strict superset, so the existing 2.0/2.1 tags were kept alongside the new wcag22aa tag rather than replaced.",
    "AxeBuilder#withRules and AxeBuilder#withTags cannot be combined (both write this.option.runOnly and silently overwrite each other - confirmed directly against the installed @axe-core/playwright source, not assumed from its public API docs alone). Used AxeBuilder#options({ rules: { 'target-size': { enabled: true } } }) called before withTags(...) instead: options() only touches .rules, withTags() only touches .runOnly, so both survive on the same options object.",
    "Verified target-size actually runs (not silently inapplicable) with a standalone axe-core run against the live built app, checking result.passes rather than only trusting a green Playwright assertion.",
    "Did not change the 44px AAA bar's coverage - SC 2.5.5 (Target Size Enhanced) has no axe-core rule at all, at any tag or options setting, confirmed in the prior touch-target-and-contrast-audit session. That half of the checklist item remains manual-measurement-only.",
  ],
  milestones: [
    "tests-e2e/accessibility.spec.ts: withTags scope now includes wcag22aa; target-size force-enabled via options(); test names changed from 'no WCAG 2.1 AA violations' to 'no WCAG 2.2 AA violations'.",
    "src/web/AGENTS.md and src/web/__tests__/AGENTS.md: touch-target and axe-core scope descriptions updated to reflect the rule now actually running and passing, not just documented as a gap.",
  ],
  validation: [
    "npx tsc --noEmit passes clean.",
    "npx playwright test tests-e2e/accessibility.spec.ts against a real built standalone server with correct fixture env vars - all 7 tests pass, including the two touch-target tests.",
    "Standalone node script against the same running server confirms target-size produced a real pass result (not inapplicable/skipped) for the home page.",
  ],
  visibility: "public",
};
