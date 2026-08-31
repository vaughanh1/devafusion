import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "devafusion-com-spf-txt-recordset-conflict",
  date: "2026-08-30",
  title: "Fix devafusion.com SPF TXT recordset conflict",
  summary:
    "terraform apply failed to create the new SPF TXT record because Azure DNS treats every TXT value at the same name as one recordset, and a second azurerm_dns_txt_record resource at \"@\" collided with the existing Google site verification record already managing that recordset.",
  tags: ["terraform", "dns", "email", "incident"],
  decisions: [
    "Merge the SPF value into the existing devafusion_com_google_verification TXT resource as an additional record block instead of declaring a separate resource at the same name.",
    "Leave the DKIM CNAME and DMARC TXT records unchanged since they applied successfully against unused names.",
  ],
  milestones: [
    "Removed the standalone devafusion_com_spf TXT resource that duplicated the \"@\" recordset.",
    "Added the SPF value as a second record block on devafusion_com_google_verification.",
    "Re-validated with terraform fmt -check and terraform validate.",
  ],
  validation: ["terraform fmt -check", "terraform validate"],
  visibility: "public",
};
