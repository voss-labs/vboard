import { Resend } from "resend";

// Lazy-construct the client so missing env vars surface at call time, not at module load
// (server-only — never import from client code).
function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function getFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }
  return from;
}

export async function sendVerificationEmail(params: {
  to: string;
  verificationUrl: string;
}): Promise<void> {
  const { to, verificationUrl } = params;
  const resend = getResend();

  await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: "Verify your vboard email",
    html: `
			<p>Hi,</p>
			<p>Click the link below to verify your vboard account:</p>
			<p><a href="${verificationUrl}">${verificationUrl}</a></p>
			<p>If you did not sign up for vboard, you can safely ignore this email.</p>
		`,
  });
}
