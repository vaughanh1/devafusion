import "server-only";

import { Resend } from "resend";

// UK GDPR Article 5(1)(c) (data minimisation) / PECR: an MFA challenge
// code email has no legitimate marketing/analytics purpose, so it
// must not carry Resend's open/click tracking pixels and link
// rewriting. Verified directly against Resend's own current API
// reference (resend.com/docs/api-reference/emails/send-email) and
// the installed resend@^6.28.1 package's CreateEmailOptions type:
// there is no per-email "tracking" request field - open_tracking/
// click_tracking are domain-level settings only (Domain/
// DomainApiOptions interfaces), configured once when the sending
// domain is provisioned (a manual Resend dashboard/API step, not
// something this route can or should override per-send). This
// module's own contract is therefore: the sending domain
// (RESEND_SENDING_DOMAIN's domain, provisioned separately) must have
// open_tracking and click_tracking left disabled at the domain level
// - documented here so that invariant is never silently broken by a
// future domain reconfiguration.
let resendClient: Resend | undefined;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set - cannot dispatch an MFA email OTP.",
    );
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

export async function sendEmailOtp(
  toEmail: string,
  code: string,
): Promise<void> {
  const fromAddress = process.env.RESEND_MFA_FROM_ADDRESS;
  if (!fromAddress) {
    throw new Error(
      "RESEND_MFA_FROM_ADDRESS is not set - cannot dispatch an MFA email OTP.",
    );
  }

  const { error } = await getResendClient().emails.send({
    from: fromAddress,
    to: toEmail,
    subject: "Your sign-in verification code",
    text: `Your verification code is ${code}. This code expires in 3 minutes. If you did not request this, you can safely ignore this email.`,
  });

  if (error) {
    throw new Error(`Resend failed to dispatch the MFA email OTP: ${error.message}`);
  }
}
