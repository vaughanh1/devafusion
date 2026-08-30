import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "agents-hub-and-spoke-refactor",
  date: "2026-08-28",
  title:
    "Split AGENTS.md into a Hub-and-Spoke model and locked down file layout",
  summary:
    "Split the monolithic root AGENTS.md into a universal Hub plus stack-specific Spokes, added a reusable spoke template for future modules, introduced Tailwind v4 dark theme tokens, and made component/feature file layout a build-breaking ESLint gate instead of an unenforced convention.",
  tags: ["architecture", "documentation", "tailwind", "eslint", "nextjs"],
  decisions: [
    "Keep only universal, cross-stack rules in the root AGENTS.md (Persona, Dual-Model handover, Git discipline, Pre-Flight Gate, PR pipeline, skills policy, Zero Hardcoded Secrets/Standardized Tooling/Duty to Warn/Strict Code Commenting) so the Hub never needs editing when a new module or stack is added.",
    "Move Next.js/TypeScript/Tailwind/Routing rules into src/web/AGENTS.md and Terraform/Azure/Key Vault rules into a new infrastructure/AGENTS.md, rather than leaving them stripped with nowhere to live - real code stays governed, not just a hypothetical future module.",
    "Add .templates/module.agent.md as an inert, reusable spoke template for a future module (e.g. Auth) rather than instantiating it against nonexistent code.",
    "Keep component/feature filenames kebab-case rather than PascalCase, matching the existing 5 component files and eslint-config-next's own default; PascalCase is enforced on the exported symbol through existing TypeScript conventions instead of the filename.",
    "Ship the dark obsidian/neon theme as CSS variable tokens following the existing globals.css prefers-color-scheme pattern, then actually consume them: replacing every hardcoded zinc-*/bg-white utility across app/** and components/** with the semantic tokens (text-foreground, text-muted, border-surface-border, bg-surface, bg-accent) was the only way to make dark mode render correctly at all - the pre-existing site had a real black-on-black bug, since body's background/foreground already flipped for prefers-color-scheme: dark but every heading, border and button color was a hardcoded light-mode-only zinc-* utility with no dark: variant.",
    "Corrected the literal task spec's next lint --max-warnings=0: Next.js 16 removed the next lint command entirely (next build no longer runs a linter, and there is no next lint subcommand). Used eslint --max-warnings 0 - the ESLint CLI directly - to get the same zero-warning enforcement without a broken script.",
    "Mapped the requested src/app / src/modules layout rules onto the real tree (src/web/app, src/web/components, src/web/features) since the repo does not have a top-level src/app or src/modules.",
  ],
  milestones: [
    "Trimmed root AGENTS.md to the universal Hub and added a Spoke Index linking to src/web/AGENTS.md, infrastructure/AGENTS.md, and .templates/module.agent.md.",
    "Extended src/web/AGENTS.md with Next.js/TypeScript/Tailwind/Routing/SEO rules and file-layout enforcement notes, preserving the existing next-dev auto-generated block untouched.",
    "Added infrastructure/AGENTS.md with Terraform, Secret Provisioning, Key Vault, Azure App Service, and PostgreSQL rules.",
    "Added .templates/module.agent.md as a copy-and-fill-in template for future modules.",
    "Added --surface/--surface-border/--accent/--accent-secondary/--accent-foreground/--muted tokens to src/web/app/globals.css, mapped through @theme inline, with obsidian/neon values in the existing dark media block.",
    "Replaced hardcoded zinc-*/bg-white classes with the new semantic tokens across all 9 app/**/page.tsx files and 4 components (site-header, site-footer, main-navigation, cookie-banner), fixing the pre-existing black-on-black rendering bug under a dark OS color scheme preference.",
    "Installed eslint-plugin-check-file and added check-file/folder-naming-convention and check-file/filename-naming-convention rules to eslint.config.mjs for app/**, components/**, and features/**.",
    "Changed src/web/package.json's lint script to eslint --max-warnings 0.",
  ],
  validation: [
    "npx eslint --max-warnings 0 passed clean after fixing an initial config glob that incorrectly matched non-JS/TS files (favicon.ico, globals.css) and threw parser errors - narrowed the check-file file matcher to *.{ts,tsx}.",
    "Verified the new filename rule actually fires by temporarily adding a PascalCase test file under components/ and confirming ESLint rejected it, then removed the test file and re-ran eslint clean.",
    "npx tsc --noEmit passed clean.",
    "npm run build compiled successfully with the new theme tokens in place; no route regressions.",
    "Started the standalone build locally and fetched the compiled CSS chunk directly: confirmed prefers-color-scheme: dark, the neon accent value, and the text-foreground utility class all present in the shipped stylesheet; confirmed zero remaining zinc- occurrences across src/web/app and src/web/components via a codebase-wide search.",
    "Infrastructure unchanged (only infrastructure/AGENTS.md, a doc file, was added) - Terraform fmt/validate skipped per the Pre-Flight Gate's own IF/ELSE rule.",
  ],
  visibility: "public",
};
