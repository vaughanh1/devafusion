import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "acs-dns-root-apex-and-sender-import",
  date: "2026-09-18",
  title: "ACS DNS recordset collision and a self-healing sender-username fix",
  summary:
    "The CD pipeline's terraform apply failed on the ACS Domain/SPF verification records for devafusion.net: Azure's verification_records name is the bare zone apex, and a second azurerm_dns_txt_record at \"@\" collides with the recordset devafusion_net_google_verification already owns there - the same class of bug as the earlier devafusion-com-spf-txt-recordset-conflict incident. Fixed by merging the ACS values into that existing resource instead. Also switched the domain's auto-provisioned DoNotReply sender username from a plain resource to azapi_update_resource, since Azure creates that resource itself the moment the domain exists - Terraform can only ever patch it, never create or delete it. Also corrected devafusion.net's _dmarc record, which pointed its aggregate reports at a domain with no real mailbox.",
  tags: ["infrastructure", "terraform"],
  decisions: [
    "Merged the ACS Domain and SPF verification values into devafusion_net_google_verification as extra record blocks, the same pattern devafusion_com_google_verification already uses for its own SPF value, rather than a second resource at the same name.",
    "Repointed devafusion_net_dmarc's rua address to dmarc@devafusion.com - devafusion.net has no real mailbox behind it, so aggregate reports sent there would just bounce.",
    "Managed the sender username with azapi_update_resource instead of azurerm's own resource type or a native import block: Azure auto-provisions this resource, so a plain resource always fails on \"already exists\", and an import block's id has to be known at plan time, which the domain's own id isn't on a fresh environment's first apply. azapi_update_resource only ever PATCHes an existing resource_id, matching what Terraform actually owns here - the display name, not the resource's lifecycle. A side effect worth noting: this also makes a manual Portal deletion harmless, since Azure just re-provisions the default and the next apply re-patches it.",
    "Added modules/email's own required_providers entry for azapi - without one, init resolved the wrong publisher (hashicorp/azapi) instead of the root's Azure/azapi.",
    "Ran terraform state rm on the old sender-username address before swapping resource types, otherwise Terraform plans a real destroy against the live resource.",
  ],
  milestones: [
    "dns.tf: removed the standalone ACS TXT resources; their values live on devafusion_net_google_verification instead.",
    "dns.tf: devafusion_net_dmarc's rua corrected to dmarc@devafusion.com.",
    "modules/email/main.tf: sender username now managed via azapi_update_resource, with its own required_providers block.",
    "Removed the old sender-username address from the real dev backend state.",
  ],
  validation: [
    "terraform fmt -check and terraform validate passed clean from infrastructure/app/environments/dev.",
    "terraform plan against the real backend confirmed a real destroy on the old sender-username address before state rm, and none after; final plan showed only the two genuinely new resources, plus pre-existing unrelated Key Vault identity drift from a local run.",
  ],
  visibility: "public",
};
