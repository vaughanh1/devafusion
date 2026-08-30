import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "ga4-analytics-with-consent-mode",
  date: "2026-08-27",
  title: "GA4 analytics behind a consent-first cookie banner",
  summary:
    "Added Google Analytics 4 with Consent Mode v2, defaulting to denied storage until a visitor accepts, moved Key Vault secret consumption for this GA4 ID and the existing Google verification strings from Terraform-managed resources to Terraform data sources, made an explicit App Service restart mandatory at the end of every CD pipeline that changes code or app settings, and removed several repeated literals across the Terraform configuration in favour of single-sourced locals and resource references.",
  tags: ["analytics", "privacy", "next.js", "terraform", "azure"],
  decisions: [
    "Use @next/third-parties/google rather than a hand-rolled <script> tag, so tracking loads through Next.js's own script strategy instead of a raw head injection.",
    "Set Consent Mode v2 defaults (analytics_storage and ad_storage denied) from instrumentation-client.ts, the framework-native file that runs before hydration, rather than an inline script embedded in the layout.",
    "Show a single two-button banner (Accept/Reject) with no nested preference screen, storing the choice in localStorage via useSyncExternalStore so the decision persists without re-prompting.",
    "Write a short, factual Privacy & Cookies page rather than reusing generic Terms of Service or compliance boilerplate that would misdescribe a personal site as a company.",
    "Reconsider how the GA4 secret should reach Terraform: an Azure DevOps variable group linked to Key Vault was set up first, but Terraform in this repository already writes secrets into Key Vault and other resources read them back out with the .value attribute — a linked variable group would have needed Key Vault to be populated before Terraform could create it, which does not hold up. Converted the existing Google verification secrets from Terraform-managed resources to data sources reading Key Vault directly, added the new GA4 secret the same way, and removed the now-unnecessary variable group wiring and TF_VAR_* mappings from the Terraform CI pipeline.",
    "Treat creating or rotating a secret's value directly in Key Vault as the one sanctioned manual step, since Terraform can no longer be the thing that writes these values.",
    "Add an explicit az webapp restart step to both the web and Terraform CD pipelines rather than relying on Azure to reload the app on its own, since this project deploys directly to the App Service with no deployment slot to swap through.",
    "Derive the web app and resource group names for the Terraform CD pipeline's restart step from terraform output rather than a second hardcoded literal, since that pipeline already runs terraform apply in the same working directory. The web CD pipeline does not run Terraform at all, so its two name variables stay as named, labelled pipeline variables rather than forcing a checkout and terraform init into a pipeline deliberately kept Terraform-free.",
    "Stop letting the same literal (a domain name, a tag map) be typed out more than once across Terraform files: introduced primary_domain/secondary_domain locals consumed by the DNS zones, and pointed the domain registration and custom hostname binding resources at the zone resources' own .name attribute instead of repeating the string. Did the same for the bootstrap stack's tag map.",
  ],
  milestones: [
    "Added components/analytics/google-analytics.tsx and components/consent/cookie-banner.tsx, wired into the root layout.",
    "Added app/legal/page.tsx and listed it in sitemap.ts.",
    "Converted keyvault.tf's Google verification azurerm_key_vault_secret resources to azurerm_key_vault_secret data sources, and added a third data source for the GA4 secret.",
    "Added an app_settings input to the webapp module and wired NEXT_PUBLIC_GA_ID through from the new Key Vault data source.",
    "Removed the devafusion-google-search-verification variable group and its TF_VAR_* mappings from the Terraform CI pipeline.",
    "Added an AzureCLI restart step to pipelines/cd/dev.yml (after the web app deploy) and pipelines/cd/infrastructure.yml (after terraform apply, reading the app and resource group names from terraform output).",
    "Added primary_domain/secondary_domain locals and a bootstrap-stack common_tags local, removing five repeated string/map literals from dns.tf, domains.tf, web.tf, and bootstrap/main.tf.",
    "Added an AGENTS.md rule forbidding repeated literals across Terraform files outside the one technically-forced exception of a backend block.",
    "Corrected an inaccurate AGENTS.md claim that Next.js fails the build on an unset NEXT_PUBLIC_ variable; it silently inlines undefined, so the standard now describes the real risk (public bundling) and the real mitigation (a runtime falsy check).",
  ],
  validation: [
    "npm run lint",
    "npm run typecheck",
    "npm run build",
    "terraform fmt -check (app/environments/dev and bootstrap)",
    "terraform validate (app/environments/dev and bootstrap)",
  ],
  visibility: "public",
};
