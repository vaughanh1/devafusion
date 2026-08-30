import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "codifying-engineering-standards-and-secret-scanning",
  date: "2026-08-27",
  title:
    "Codifying engineering standards, then proving them with secret scanning",
  summary:
    "Wrote down the engineering standards this project had been following informally, then delivered automated secret scanning as the first feature built under them, so the rules are demonstrated rather than just declared.",
  tags: ["process", "security", "devops", "typescript"],
  decisions: [
    "Write the standards down before the next feature, not after. Rules that only exist in a person's head drift the moment attention moves elsewhere; a standard is only real once it is legible to whoever (or whatever) picks up the next piece of work.",
    "Prefer role-based language over naming specific AI models in the standards document. Tooling choices change; the division of responsibility between planning and implementation should survive that change without a rewrite.",
    "Treat 'vertical slice' as the default shape of a change: a commit should carry a feature and its documentation together, not split documentation into a trailing, easily-forgotten cleanup step. The previous entry in this log was itself a lesson in that risk, having originally been merged separately from the change it described.",
    "Require every push to be preceded by a log entry, and every pull request and merge to require explicit human approval. Automation should accelerate review, not remove it.",
    "For secret scanning specifically, use only the vendor's own official distribution channel. gitleaks has no first-party npm package, so rather than depend on an unofficial third-party wrapper, a small script fetches the official checksum-verified release binary directly from GitHub and caches it locally. The same pinned version and checksum are used in Husky and in both CI pipelines, so local and server-side enforcement never disagree.",
    "Scope local secret scanning to staged changes only (git diff, not the working tree), so it enforces the commit boundary without being tripped up by incidental local files. CI additionally scans full pushed history as a second, independent layer.",
  ],
  milestones: [
    "Rewrote AGENTS.md into a structured set of standards covering git workflow, TypeScript and Tailwind conventions, Next.js routing and metadata guarantees, infrastructure constraints, and the human approval gates required before pushing, opening, or merging a pull request.",
    "Added scripts/ensure-gitleaks.mjs, which downloads and checksum-verifies the official gitleaks release binary for the current platform into a git-ignored cache.",
    "Wired gitleaks into the Husky pre-commit hook, scanning staged changes before every commit.",
    "Added the same checksum-verified gitleaks scan as a step in both the web and Terraform CI pipelines, scanning full repository history server-side.",
    "Found and removed a stale, git-ignored local Terraform state backup containing live storage account keys, surfaced by the very first scan.",
  ],
  validation: [
    "gitleaks protect --staged run manually and via the Husky hook, confirmed clean after removing the flagged local state backup",
    "npm run lint",
    "npm run typecheck",
    "npm run build",
    "terraform fmt -check -recursive",
    "terraform validate",
  ],
  visibility: "public",
};
