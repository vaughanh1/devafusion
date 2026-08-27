export type LogEntry = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  decisions: string[];
  milestones: string[];
  validation: string[];
  commit?: string;
  pullRequest?: string;
  visibility: "public" | "private";
};

export const engineeringLog: LogEntry[] = [
  {
    slug: "project-inception-and-architecture",
    date: "2026-08-26",
    title: "Project inception and architecture",
    summary:
      "Established Devafusion as a public technical laboratory and chose a code-first, auditable path for its web application, Azure infrastructure, delivery process, and future documentation.",
    tags: ["architecture", "azure", "terraform", "devops", "gdpr"],
    decisions: [
      "Use Next.js App Router for a server-first web application with route-level metadata, an efficient deployment model, and a clear path to interactive features where needed.",
      "Use Linux App Service with Node.js because the application is a Node-based web workload and the Linux hosting model is a straightforward fit for the standalone Next.js server.",
      "Start with the Azure B1 App Service plan as a proportionate, low-cost baseline for an early-stage public site, with capacity and reliability requirements to be reviewed as usage grows.",
      "Manage Azure resources with Terraform from the outset so infrastructure is reviewable, repeatable, and separated from application code.",
      "Use GitHub for source control and pull requests, Azure DevOps for CI/CD, and protected approval environments for infrastructure changes.",
      "Use managed App Service certificates and Next.js redirection capabilities to avoid introducing Azure Front Door before its cost and routing features are justified.",
      "Keep public engineering summaries sanitized and design future private detail as protected data rather than embedding personal or sensitive information in this public repository.",
    ],
    milestones: [
      "Created a repository structure separating infrastructure, application code, and pipeline definitions.",
      "Established branch, pull request, pipeline, and resource naming conventions around the develop workflow.",
      "Added repository and VS Code tooling for Terraform, YAML, ESLint, Prettier, EditorConfig, GitHub pull requests, and Azure App Service.",
      "Added linting, TypeScript checking, and build validation to the web CI path, with Husky providing a local commit-time quality gate.",
      "Separated web and infrastructure deployment pipelines so web-only changes do not require a Terraform plan.",
    ],
    validation: [
      "Reviewed Terraform-managed Linux App Service and managed certificate configuration.",
      "Reviewed Azure DevOps CI/CD triggers, artifacts, and approval environment configuration.",
      "Confirmed current checks include lint, typecheck, and production build; Playwright testing is planned next.",
    ],
    visibility: "public",
  },
  {
    slug: "separate-web-and-infrastructure-deployments",
    date: "2026-08-26",
    title: "Separate web and infrastructure deployments",
    summary:
      "Separated web delivery from Terraform application delivery so a web-only change does not depend on an infrastructure plan or approval stage.",
    tags: ["devops", "terraform", "azure-devops"],
    decisions: [
      "Keep devafusion-dev-cd focused on deploying the web artifact from devafusion-web-ci.",
      "Give Terraform apply its own CD pipeline, triggered by successful Terraform CI runs on develop.",
      "Keep infrastructure approval attached to the devafusion-dev environment without coupling it to web releases.",
    ],
    milestones: [
      "Removed the Terraform stage and plan download from the web CD pipeline.",
      "Added a dedicated infrastructure CD pipeline for Terraform plan application.",
      "Made pipeline completion triggers explicit for the develop branch.",
    ],
    validation: ["git diff --check", "Next.js build and typecheck"],
    visibility: "public",
  },
  {
    slug: "seo-and-accessible-navigation",
    date: "2026-08-26",
    title: "SEO and accessible navigation",
    summary:
      "Improved the site's search visibility and made the shared navigation work better on small screens and with keyboards or assistive technology.",
    tags: ["seo", "accessibility", "next.js"],
    decisions: [
      "Use Next.js metadata conventions for canonical, social, robots, and sitemap output.",
      "Keep navigation interaction in a small client component while leaving page content server-rendered.",
      "Treat public engineering notes as sanitized content that can later be paired with protected private detail.",
    ],
    milestones: [
      "Added canonical, Open Graph, Twitter, and robots metadata.",
      "Added generated robots.txt and sitemap.xml routes.",
      "Added responsive navigation with explicit expanded and current-page state.",
    ],
    validation: ["npm run lint", "npm run typecheck", "npm run build"],
    commit: "667d113",
    visibility: "public",
  },
  {
    slug: "key-vault-backed-google-search-verification",
    date: "2026-08-27",
    title: "Key Vault-backed Google Search verification",
    summary:
      "Added Google Search Console domain verification for devafusion.com and devafusion.net without ever committing the verification strings to code, using a new Key Vault module and a centrally managed Azure DevOps Library variable group.",
    tags: ["azure", "terraform", "security", "devops", "seo"],
    decisions: [
      "Store the Google Search verification strings as Key Vault secrets rather than literal values in Terraform, keeping DNS TXT records as the only consumer of the secret value.",
      "Give Key Vault its own reusable Terraform module, with an access policy granting the Terraform identity read/write on secrets rather than broader vault-wide permissions.",
      "Source the verification strings in CI from an Azure DevOps Library variable group rather than ad-hoc pipeline secret variables, so the same secrets can be reused and managed centrally across pipelines.",
      "Extend the Terraform service principal's custom role manually and out of band, keeping permission grants a deliberate, reviewed step rather than something Terraform grants itself.",
    ],
    milestones: [
      "Added a keyvault module provisioning an Azure Key Vault and a Terraform access policy.",
      "Added Key Vault secrets for the devafusion.com and devafusion.net verification strings, populated from sensitive Terraform variables.",
      "Added DNS TXT records on both zones that read their value from the corresponding Key Vault secret.",
      "Wired the Terraform CI pipeline to a Library variable group for the verification secrets.",
    ],
    validation: [
      "terraform fmt -check -recursive",
      "terraform validate",
      "Husky pre-commit lint and typecheck",
      "Azure DevOps Terraform CI plan succeeded against the Library variable group",
    ],
    pullRequest: "22",
    visibility: "public",
  },
];

export function getLogEntry(slug: string) {
  return engineeringLog.find((entry) => entry.slug === slug);
}
