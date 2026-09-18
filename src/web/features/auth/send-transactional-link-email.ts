import "server-only";

import { getEmailClient, getSenderAddress } from "./acs-email-client";

// Generic transactional-link sender - shared by Better Auth's own
// email-verification flow (auth.ts's emailVerification.
// sendVerificationEmail) and its password-reset flow (auth.ts's
// emailAndPassword.sendResetPassword). Both send a single link to a
// single recipient via the same verified ACS sender; only the
// subject/body content differs between callers, so that content is
// passed in rather than hardcoded here - see email-verification-
// content.ts and email-reset-password-content.ts for each caller's
// own copy.
export async function sendTransactionalLinkEmail(
  toEmail: string,
  subject: string,
  body: string,
): Promise<void> {
  const senderAddress = getSenderAddress();

  const poller = await getEmailClient().beginSend({
    senderAddress,
    content: {
      subject,
      plainText: body,
    },
    recipients: {
      to: [{ address: toEmail }],
    },
    // UK GDPR Article 5(1)(c) / PECR: neither an account-verification
    // nor a password-reset email has a legitimate marketing/
    // analytics purpose - same rationale as mfa/send-email-otp.ts's
    // own identical setting.
    disableUserEngagementTracking: true,
  });

  const result = await poller.pollUntilDone();

  if (result.status !== "Succeeded") {
    throw new Error(
      `Azure Communication Services failed to dispatch a transactional link email: ${result.status}`,
    );
  }
}
