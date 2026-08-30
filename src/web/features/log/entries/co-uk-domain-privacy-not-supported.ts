import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "co-uk-domain-privacy-not-supported",
  date: "2026-08-30",
  title: "Nominet .co.uk domains reject the privacy setting",
  summary:
    "The infrastructure CD pipeline's terraform apply for devafusion.co.uk failed with a 400 (\"The parameter privacy has an invalid value.\") after creating the DNS zone, hostname binding, and managed certificate successfully. Nominet, the UK domain registry, does not offer WHOIS privacy protection for .uk/.co.uk domains, unlike the gTLDs (.com, .net) Azure's registrar supports it for - so the azapi_resource domain resource's privacy = true was rejected outright by the registration API for this one TLD.",
  tags: ["azure", "terraform", "incident"],
  decisions: [
    "Set privacy = false specifically on the devafusion_co_uk_domain azapi_resource rather than trying to force privacy on through a different API path - this is a hard registry-level constraint from Nominet, not an Azure or Terraform limitation, so there is no configuration that makes .co.uk WHOIS privacy possible.",
    "Leave autoRenew = true unchanged for devafusion.co.uk, since the API's error response named only the privacy parameter as invalid and accepted autoRenew in the same request body.",
    "Document the constraint as a comment directly on the privacy = false line, since it is a non-obvious business rule (a registry policy difference between TLDs) rather than something the code itself makes clear.",
  ],
  milestones: [
    "Set privacy = false on azapi_resource.devafusion_co_uk_domain in domains.tf, with an inline comment explaining the Nominet restriction.",
  ],
  validation: [
    "terraform fmt -check -diff and terraform validate passed clean in infrastructure/app/environments/dev.",
    "Confirmed via the failed pipeline run's error payload that only the privacy parameter was flagged (ExtendedCode 51008, Parameters: [\"privacy\"]) - autoRenew, dnsType, and dnsZoneId in the same request all succeeded.",
  ],
  visibility: "public",
};
