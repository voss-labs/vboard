"use server"
import { revalidatePath } from "next/cache"
import { withDb } from "@/db"
import { listUpdateRecipients, recordUpdateSent } from "@/db/queries/updates"
import { firstIssue } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { devAuthEnabled } from "@/lib/dev-auth-gate"
import { siteCan } from "@/lib/rbac"
import { emailConfigured, sendEmails } from "@/lib/resend"
import { getSessionUser } from "@/lib/session"
import {
  inAudience,
  renderUpdateEmail,
  updateFormSchema,
} from "@/lib/update-email"

export async function sendUpdateAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || !siteCan(user.siteRole, "update:send"))
    return fail("Only Super admin can send updates.")
  const parsed = updateFormSchema.safeParse(
    Object.fromEntries(
      ["sendId", "subject", "message", "audience", "button", "intent"].map(
        (key) => [key, formData.get(key) ?? ""]
      )
    )
  )
  if (!parsed.success) return fail(firstIssue(parsed.error))
  if (!emailConfigured())
    return fail("Email is not set up yet. Add RESEND_API_KEY and try again.")
  const baseUrl = process.env.BETTER_AUTH_URL
  if (!baseUrl) return fail("The site address is not configured.")
  const { sendId, audience, intent, ...content } = parsed.data
  const toEmail = (recipient: { name: string; email: string }) => ({
    to: recipient.email,
    ...renderUpdateEmail(content, recipient, baseUrl),
  })

  if (intent === "test")
    return attemptAction(async () => {
      const { failure } = await sendEmails([toEmail(user)])
      return failure
        ? fail(`The test was not sent. ${failure}`)
        : done(`Test sent to ${user.email}.`)
    })

  if (devAuthEnabled())
    return fail(
      "The persona switcher is on, so the people here are seeded accounts. Send a test instead."
    )
  const result = await attemptAction(async () => {
    const recipients = (
      await withDb({ userId: user.id }, listUpdateRecipients)
    ).filter((recipient) => inAudience(recipient, audience))
    if (recipients.length === 0) return fail("Nobody is in that audience.")
    const { sent, failure } = await sendEmails(recipients.map(toEmail), sendId)
    const recorded =
      sent === 0 ||
      (await withDb({ userId: user.id }, (ctx) =>
        recordUpdateSent(ctx, {
          id: sendId,
          subject: content.subject,
          audience,
          recipients: recipients.length,
          sent,
        })
      ).then(
        () => true,
        () => false
      ))
    if (!recorded)
      return fail(
        `Sent to ${sent} of ${recipients.length} people, but the audit log entry could not be written. Do not send it again.`
      )
    return failure
      ? fail(`Sent to ${sent} of ${recipients.length} people. ${failure}`)
      : done(`Update sent to ${sent} ${sent === 1 ? "person" : "people"}.`)
  })
  if (result.ok) {
    revalidatePath("/dashboard/admin/updates")
    revalidatePath("/dashboard/admin/audit")
  }
  return result
}
