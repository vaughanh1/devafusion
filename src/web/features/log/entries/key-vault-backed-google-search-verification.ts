import type { LogEntry } from "../types";

export const entry: LogEntry = {
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
};
