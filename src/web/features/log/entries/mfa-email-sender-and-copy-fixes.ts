import type { LogEntry } from "../types";

export const entry: LogEntry = {
  slug: "mfa-email-sender-and-copy-fixes",
  date: "2026-09-17",
  title: "MFA email sender display name, accessible-digit comment correction, i18n-ready copy",
  summary:
    "Follow-up correction after being asked directly about four points: a Microsoft 365 mailbox on devafusion.com does not conflict with the MFA sender domain devafusion.net (confirmed and documented); the OTP digit separator was already a space, not a comma, but the reasoning is now made explicit with a dedicated test; email subject/body copy is now centralised rather than inlined so a future i18n adoption is a one-file change; and a prior claim that Azure had no Terraform resource for a custom sender display name was wrong - it does, and it is now provisioned.",
  tags: ["accessibility", "gdpr", "terraform", "typescript"],
  decisions: [
    "Corrected a wrong claim made in the prior slice: azurerm_email_communication_service_domain_sender_username genuinely exists in the azurerm provider (verified directly against its registry docs this time, not assumed) - provisioned as 'donotreply' with display_name = 'Devafusion' in infrastructure/app/modules/email/main.tf, giving the MFA email a real 'From: Devafusion <donotreply@devafusion.net>' rather than a bare address.",
    "Did not adopt an i18n library (no next-intl or equivalent exists in this project today) purely to future-proof email copy - that would be a speculative dependency before it's needed. Instead centralised the subject/body strings into features/auth/mfa/email-otp-content.ts as plain functions, the minimal seam that makes a future real i18n adoption a one-file change.",
    "Confirmed and documented that devafusion.com's Microsoft 365 Business mailbox and devafusion.net's MFA sender domain are on entirely separate DNS zone resources - SPF/DKIM/DMARC are scoped per-domain, not per-tenant, so there is no conflict and no shared record to collide on.",
  ],
  milestones: [
    "Added azurerm_email_communication_service_domain_sender_username to infrastructure/app/modules/email/main.tf, with an outputs.tf depends_on to guarantee ordering.",
    "Added features/auth/mfa/email-otp-content.ts (emailOtpSubject/emailOtpBody) with its own unit test, wired into send-email-otp.ts in place of inlined strings.",
    "Strengthened format-otp-for-accessibility.ts's comment explaining why a comma-separated code would not achieve the same accessibility goal as a space-separated one, and added a test asserting the output never contains a comma.",
    "Added an explicit comment to environments/dev/email.tf documenting why the devafusion.com M365 mailbox and devafusion.net's MFA sender domain do not conflict.",
    "Corrected the stale/wrong 'no Terraform resource exists' claim in docs/adr/0015, send-email-otp.ts, outputs.tf, and src/web/AGENTS.md.",
  ],
  validation: [
    "npm run typecheck and npm run lint (eslint --max-warnings 0) both passed clean.",
    "npm run test:unit: 116 passed, 0 failed across 22 files (up from 112/21 - new coverage for email-otp-content.ts and the comma-vs-space assertion).",
    "terraform fmt -check and terraform validate both passed for infrastructure/app after adding the sender-username resource.",
  ],
  visibility: "public",
};
