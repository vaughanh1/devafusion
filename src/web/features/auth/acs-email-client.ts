import "server-only";

import { EmailClient } from "@azure/communication-email";

// Shared ACS Email client singleton and sender-address lookup -
// factored out of mfa/send-email-otp.ts (which now calls this
// module) so a second real caller (send-verification-email.ts,
// Better Auth's own email-verification flow) doesn't duplicate the
// connection-string/client-singleton logic or its own comment
// explaining why ACS was chosen over Resend (see mfa/send-email-
// otp.ts's own, more detailed comment for that rationale -
// unchanged, just no longer duplicated here). Lives directly under
// features/auth/, not features/auth/mfa/, since email verification
// (the other caller) is core identity, not an MFA factor.
let emailClient: EmailClient | undefined;

export function getEmailClient(): EmailClient {
  const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "ACS_EMAIL_CONNECTION_STRING is not set - cannot dispatch an email.",
    );
  }

  emailClient ??= new EmailClient(connectionString);
  return emailClient;
}

export function getSenderAddress(): string {
  const senderAddress = process.env.ACS_EMAIL_MFA_SENDER_ADDRESS;
  if (!senderAddress) {
    throw new Error(
      "ACS_EMAIL_MFA_SENDER_ADDRESS is not set - cannot dispatch an email.",
    );
  }

  return senderAddress;
}
