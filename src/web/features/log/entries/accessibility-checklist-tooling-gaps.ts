import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "accessibility-checklist-tooling-gaps",
  date: "2026-09-18",
  title: "Documented exactly which WCAG checks Lighthouse/axe-core do and don't run",
  summary:
    "Asked directly whether stating 'must be UK GDPR and WCAG 2.2 AA/AAA compliant' should have been enough to already catch this session's aria-invalid and touch-target gaps, and whether Lighthouse should find them. Answer, verified against primary sources rather than assumed: no. Confirmed by reading the installed axe-core@4.13.0 source directly that its target-size rule is disabled by default, scoped to WCAG 2.2 tags this project's accessibility.spec.ts never requests, and even when active only checks a 24px floor (WCAG 2.2 AA SC 2.5.8), not the 44px bar (SC 2.5.5 AAA) this project actually requires - axe-core has no rule for 44px at all. Lighthouse's own published accessibility scoring weights confirm no target-size entry exists in its category either. Color contrast is the one item Lighthouse/axe-core genuinely do check automatically.",
  tags: ["accessibility", "gdpr"],
  decisions: [
    "Deliberately did not enable axe-core's built-in target-size rule as a partial substitute for the 44px requirement - it only checks 24px, and a green pass at 24px would read as 'touch targets are compliant' while silently understating the actual bar, which is worse than no automated check at all.",
    "Added a new, explicit 'What compliant actually requires you to do' section to src/web/AGENTS.md rather than relying on the existing scattered checklist items alone - a compliance goal stated as a target is not the same as a procedure, and this session's own experience (multiple gaps found only after being asked by name) is the concrete evidence for writing that down as a standing rule rather than trusting it to be inferred next time.",
    "A genuine automated 44px check (a custom axe-core rule, or a Playwright getBoundingClientRect() measurement spec) is left as a legitimate, deliberate future upgrade, not bolted on silently as a side effect of this documentation pass.",
  ],
  milestones: [
    "src/web/AGENTS.md: new section listing, per gap found this session, exactly which existing tool does or does not catch it and why - verified against axe-core's own source/types and Lighthouse's published scoring docs, not assumed.",
  ],
  validation: [
    "Every claim about axe-core/Lighthouse behaviour in this entry and in src/web/AGENTS.md's new section is backed by a direct read of the installed axe-core@4.13.0 source (node_modules/axe-core/axe.js's target-size rule definition and axe.d.ts's RuleObject type) and Lighthouse's own published v7 scoring-weights documentation, not inferred from general knowledge.",
    "No code changed in this entry - documentation only, so npm run typecheck/lint/test:unit are unaffected by this change specifically (all already green from the immediately preceding commits in this same session).",
  ],
  visibility: "public",
};
