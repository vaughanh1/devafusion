import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "devafusion-com-email-authentication",
  date: "2026-08-30",
  title: "devafusion.com email authentication (SPF, DKIM, DMARC)",
  summary:
    "Added SPF, DKIM, and DMARC DNS records for devafusion.com so mail sent from the Microsoft 365 tenant is trusted by Google and other mail providers instead of being flagged as unauthenticated.",
  tags: ["terraform", "dns", "email"],
  decisions: [
    "Scope the records to the devafusion.com zone only, matching where the existing Outlook MX record already lives.",
    "Use Microsoft 365's standard selector1/selector2 CNAME DKIM delegation rather than publishing raw DKIM keys.",
    "Start DMARC at p=none with an rua reporting address to observe alignment before considering quarantine or reject.",
  ],
  milestones: [
    "Added an SPF TXT record authorizing spf.protection.outlook.com.",
    "Added selector1 and selector2 DKIM CNAME records delegating to the onmicrosoft.com tenant.",
    "Added a _dmarc TXT record in monitor-only mode with aggregate reporting.",
  ],
  validation: ["terraform fmt -check", "terraform validate"],
  visibility: "public",
};
