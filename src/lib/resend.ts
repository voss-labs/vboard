import "server-only"

export type OutgoingEmail = {
  to: string
  subject: string
  html: string
  text: string
}

const BATCH = 100
const RETRIES = 3
const DEFAULT_FROM = "vboard <updates@vosslabs.org>"

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

export function emailSender() {
  return process.env.EMAIL_FROM || DEFAULT_FROM
}

async function sendBatch(emails: OutgoingEmail[], idempotencyKey?: string) {
  const from = emailSender()
  let failure = "Resend did not respond."
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(emails.map((email) => ({ from, ...email }))),
        signal: AbortSignal.timeout(20_000),
      })
      if (response.ok) return null
      failure = `Resend answered ${response.status}.`
      if (response.status !== 429 && response.status < 500) return failure
    } catch {
      failure = "Resend could not be reached."
    }
    if (attempt < RETRIES)
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt))
  }
  return failure
}

export async function sendEmails(emails: OutgoingEmail[], sendId?: string) {
  let sent = 0
  for (let start = 0; start < emails.length; start += BATCH) {
    const failure = await sendBatch(
      emails.slice(start, start + BATCH),
      sendId && `update-${sendId}-${start / BATCH}`
    )
    if (failure) return { sent, failure }
    sent += Math.min(BATCH, emails.length - start)
  }
  return { sent, failure: null }
}
