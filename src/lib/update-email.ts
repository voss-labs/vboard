import { z } from "zod"
import { linkify } from "@/lib/linkify"
import { isProfileComplete, type ProfileDetails } from "@/lib/profile"

export const UPDATE_AUDIENCES = {
  everyone: "Everyone who has signed in",
  complete: "People with a complete profile",
  incomplete: "People who have not completed their profile",
} as const
export type UpdateAudience = keyof typeof UPDATE_AUDIENCES

export const UPDATE_BUTTONS = {
  profile: { label: "Update your profile", path: "/dashboard/profile" },
  discover: { label: "Open vboard", path: "/" },
  none: null,
} as const
export type UpdateButton = keyof typeof UPDATE_BUTTONS

export type UpdateRecipient = ProfileDetails & {
  id: string
  name: string
  email: string
}

export type UpdateContent = {
  subject: string
  message: string
  button: UpdateButton
}

export const updateFormSchema = z
  .object({
    sendId: z.uuid(),
    subject: z
      .string()
      .trim()
      .min(3, "Write a subject")
      .max(120, "Keep the subject under 120 characters"),
    message: z
      .string()
      .trim()
      .min(1, "Write the update")
      .max(4000, "Keep the update under 4000 characters"),
    audience: z.enum(["everyone", "complete", "incomplete"]),
    button: z.enum(["profile", "discover", "none"]),
    intent: z.enum(["test", "send"]),
  })
  .strict()

const INK = "#0A0A0A"
const ACCENT = "#C4421D"

export function inAudience(
  recipient: UpdateRecipient,
  audience: UpdateAudience
) {
  if (audience === "everyone") return true
  return isProfileComplete(recipient) === (audience === "complete")
}

export function audienceCounts(recipients: UpdateRecipient[]) {
  const complete = recipients.filter((r) => isProfileComplete(r)).length
  return {
    everyone: recipients.length,
    complete,
    incomplete: recipients.length - complete,
  } satisfies Record<UpdateAudience, number>
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function paragraphs(message: string) {
  return message
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function richText(paragraph: string) {
  return linkify(paragraph)
    .map((segment) =>
      segment.href
        ? `<a href="${escapeHtml(segment.href)}" style="color:${ACCENT};">${escapeHtml(segment.text)}</a>`
        : escapeHtml(segment.text).replaceAll("\n", "<br>")
    )
    .join("")
}

export function renderUpdateEmail(
  content: UpdateContent,
  recipient: { name: string },
  baseUrl: string
) {
  const firstName = recipient.name.trim().split(/\s+/)[0] || "there"
  const body = paragraphs(content.message)
  const button = UPDATE_BUTTONS[content.button]
  const link = !button
    ? null
    : URL.canParse(button.path, baseUrl)
      ? new URL(button.path, baseUrl).href
      : button.path
  const text = [
    `Hi ${firstName},`,
    ...body,
    ...(button && link ? [`${button.label}: ${link}`] : []),
    "vboard · VOSS Labs · Vidyalankar Institute of Technology\nYou are receiving this because you signed in to vboard with your VIT account.",
  ].join("\n\n")
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:40px 16px;background:#F5F5F4;font-family:Geist,Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E7E5E4;border-radius:14px;">
      <tr><td style="padding:36px;">
        <span style="font-size:24px;font-weight:800;letter-spacing:-0.03em;color:${INK};">vboard</span><span style="display:inline-block;width:9px;height:9px;border-radius:9px;background:${ACCENT};margin-left:5px;"></span>

        <div style="margin-top:32px;font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;color:${INK};">${escapeHtml(content.subject)}</div>
        <div style="margin-top:20px;font-size:15px;color:${INK};line-height:1.65;">Hi ${escapeHtml(firstName)},</div>
${body.map((paragraph) => `        <div style="margin-top:14px;font-size:15px;color:${INK};line-height:1.65;">${richText(paragraph)}</div>`).join("\n")}
${
  button && link
    ? `        <div style="margin-top:28px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:${INK};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">${escapeHtml(button.label)}</a></div>`
    : ""
}
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E7E5E4;font-size:12px;color:#A8A29E;line-height:1.6;">
          vboard &middot; VOSS Labs &middot; Vidyalankar Institute of Technology<br>
          You are receiving this because you signed in to vboard with your VIT account.
        </div>
      </td></tr>
    </table>
  </body>
</html>`
  return { subject: content.subject, html, text }
}
