import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "lighthouse-html-report-tabs",
  date: "2026-09-17",
  title: "Lighthouse HTML reports as pipeline run tabs",
  summary:
    "LighthouseCI's per-page reports were previously only reachable by downloading the lighthouse-reports pipeline artifact and opening the HTML files locally. Added the org-installed blakyaks.azure-pipeline-html-reports extension's PublishHtmlReport@1 task to render each page's report as its own tab under the run's Reports section, with a small pre-step that copies lhci's representative-run output into readable, page-named files first.",
  tags: ["ci", "accessibility", "tooling"],
  decisions: [
    "Adopted PublishHtmlReport@1 from blakyaks.azure-pipeline-html-reports after the extension was installed org-wide - not a unilateral tooling pick; a different candidate (a maintained fork of the same original project, awardedsolutions.azure-pipelines-html-report-awardedsolutions) had been evaluated earlier but not chosen, and the org-admin install decision for the BlakYaks release was made outside this change.",
    "Verified the task's actual constraints from its own marketplace listing before wiring it in: reportDir accepts a directory and publishes every *.html/*.htm file inside as a separate tab, defaulting to filename-derived tab names (useFilenameTabs) - and reports must be self-contained (no external CSS/JS/relative links) due to CORS, which lhci's own HTML output already satisfies (inlined JSON/CSS/JS, confirmed by inspecting a real generated report).",
    "Added scripts/ci/lighthouse-rename-reports.mjs rather than pointing the task directly at .lighthouseci/ - lhci's raw output is lhr-<timestamp>.html, one per run (9 files for 3 pages x 3 numberOfRuns), with no page-identifying information in the filename; publishing those directly would produce 9 unreadable tabs. The script reads lhci's own filesystem-upload manifest.json (present because .lighthouserc.js's ci.upload.target is 'filesystem') and keeps only each page's isRepresentativeRun entry - the same median run categories:* assertions already gate on - copying it to a friendly <page>.html filename.",
    "Verified the rename script against a hand-built manifest.json fixture (matching lhci's real per-entry schema: url, isRepresentativeRun, htmlPath, jsonPath, summary) before relying on it in the pipeline - confirmed it correctly skips non-representative duplicate runs and derives 'home'/'projects'/'log' from each URL's pathname.",
    "Kept the existing lighthouse-reports pipeline artifact publish alongside the new tabs, unchanged - it still holds every raw run (all 9 files, full JSON) for anyone who needs deeper per-audit drill-down than a single representative HTML report provides.",
  ],
  milestones: [
    "scripts/ci/lighthouse-rename-reports.mjs (new): copies each page's representative-run lhci HTML report to a friendly filename in .lighthouseci/renamed/.",
    "pipelines/ci/web.yml: LighthouseCI job gained a 'Rename Lighthouse reports for readable tabs' step and a PublishHtmlReport@1 task, both condition: always(), ahead of the existing artifact publish.",
    "src/web/AGENTS.md: documented the mechanism, including why the raw lhci output needed renaming before publishing.",
  ],
  validation: [
    "Ran the rename script locally against a hand-authored manifest.json fixture (4 entries, one non-representative duplicate for the home page) and 4 stub HTML files - output correctly produced exactly 3 renamed files (home.html, projects.html, log.html), excluding the non-representative duplicate.",
    "npm run lint and npx tsc --noEmit both pass clean against the new script and the pipelines/ci/web.yml and src/web/AGENTS.md edits.",
  ],
  visibility: "public",
};
