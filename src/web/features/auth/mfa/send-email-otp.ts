import "server-only";

import { getEmailClient, getSenderAddress } from "../acs-email-client";
import { emailOtpBody, emailOtpSubject } from "./email-otp-content";
import { formatOtpForAccessibility } from "./format-otp-for-accessibility";

// UK GDPR data-sovereignty requirement (this project's own already-
// settled position, docs/adr/0012's third-party-identity-SaaS
// rejection) - Resend was evaluated and rejected: even its
// nearest-to-UK "EU West (Ireland)" region is a latency-optimization
// choice only, not a data-residency guarantee - email content itself
// is stored in the US regardless of which region a Resend account is
// configured with. Azure Communication Services Email is used
// instead: its data_location is a genuine, Terraform-declared
// resource-level setting (infrastructure/app/environments/dev's
// email.tf, data_location = "UK") - Microsoft's own documented
// privacy page states plainly that "the system processes email
// message content in real-time, using the resource's Data Location
// specified by you during resource provisioning." It is also a
// first-party Microsoft service already inside this project's own
// Azure tenant - no new vendor, no new DPA to review.
//
// UK GDPR Article 5(1)(c) / PECR: an MFA challenge code has no
// legitimate marketing/analytics purpose, so it must not carry open/
// click tracking. Unlike Resend (a per-send field that does not
// exist on its real API, forcing this project to document domain-
// level tracking as an external, dashboard-configured invariant),
// Azure Communication Services' tracking setting is itself a
// Terraform-declared resource attribute
// (azurerm_email_communication_service_domain.user_engagement_tracking_enabled,
// defaulting to false) - the invariant is enforced in code, not by a
// dashboard toggle that could silently drift. disableUserEngagementTracking
// below is set as belt-and-braces defense-in-depth on top of that
// resource-level default, not a substitute for it.
//
// Sender is donotreply@devafusion.net (a verified custom domain, an
// explicit product decision over the Azure-managed *.azurecomm.net
// default - see infrastructure/app/modules/email/main.tf), giving
// this email real brand trust and enabling DKIM/SPF/DMARC on this
// project's own zone rather than Microsoft's shared domain. The
// friendly "Devafusion" From display name is configured once on the
// azurerm_email_communication_service_domain_sender_username
// Terraform resource (infrastructure/app/modules/email/main.tf), not
// passed here - the installed @azure/communication-email SDK's
// EmailMessage.senderAddress is a plain string with no displayName
// field, and Azure attaches the configured display name
// automatically based on which verified sender address is used.
//
// Cost note (not free): Azure Communication Services Email has no
// free tier - it is billed per email sent plus per MB transferred
// (Azure's published Communication Services pricing page). At this
// project's expected MFA-OTP volume this is a small, metered cost,
// but it is a real, ongoing line item against this project's Azure
// bill, not a zero-cost service.
export async function sendEmailOtp(
  toEmail: string,
  code: string,
): Promise<void> {
  const senderAddress = getSenderAddress();

  // UK GDPR/accessibility requirement, not cosmetic: a bare 6-digit
  // run is read by screen readers and spoken aloud as one large
  // number, not six individually distinguishable digits - see
  // format-otp-for-accessibility.ts's own comment.
  const accessibleCode = formatOtpForAccessibility(code);

  const poller = await getEmailClient().beginSend({
    senderAddress,
    content: {
      subject: emailOtpSubject(),
      plainText: emailOtpBody(accessibleCode),
    },
    recipients: {
      to: [{ address: toEmail }],
    },
    disableUserEngagementTracking: true,
  });

  const result = await poller.pollUntilDone();

  if (result.status !== "Succeeded") {
    throw new Error(
      `Azure Communication Services failed to dispatch the MFA email OTP: ${result.status}`,
    );
  }
}
