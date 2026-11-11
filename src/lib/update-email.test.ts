import { describe, expect, it } from "vitest"
import {
  audienceCounts,
  inAudience,
  renderUpdateEmail,
  updateFormSchema,
  type UpdateRecipient,
} from "@/lib/update-email"

const complete: UpdateRecipient = {
  id: "u1",
  name: "Priya Nair",
  email: "priya@vit.edu.in",
  rollNumber: "23102A0054",
  department: "CMPN",
  cohortYear: 2023,
  phone: "9876543210",
}
const signedInOnly: UpdateRecipient = {
  ...complete,
  id: "u2",
  rollNumber: null,
  department: null,
  cohortYear: null,
  phone: null,
}
const noPhone: UpdateRecipient = { ...complete, id: "u3", phone: null }
const base = "https://vboard.vosslabs.org"

describe("update audiences", () => {
  it("splits people by whether their profile can register", () => {
    const everyone = [complete, signedInOnly, noPhone]
    expect(audienceCounts(everyone)).toEqual({
      everyone: 3,
      complete: 1,
      incomplete: 2,
    })
    expect(everyone.filter((r) => inAudience(r, "incomplete"))).toEqual([
      signedInOnly,
      noPhone,
    ])
    expect(everyone.filter((r) => inAudience(r, "complete"))).toEqual([
      complete,
    ])
    expect(everyone.every((r) => inAudience(r, "everyone"))).toBe(true)
  })
})

describe("update email", () => {
  const content = {
    subject: "Add your <contact> number",
    message:
      'First line\nsecond line\n\n\n<script>alert("x")</script> & more\n\nRead https://vboard.vosslabs.org/posts/a?b=1&c=2.',
    button: "profile" as const,
  }

  it("greets by first name and escapes everything the admin typed", () => {
    const { html, text, subject } = renderUpdateEmail(content, complete, base)
    expect(subject).toBe(content.subject)
    expect(html).toContain("Hi Priya,")
    expect(html).toContain("Add your &lt;contact&gt; number")
    expect(html).toContain("First line<br>second line")
    expect(html).toContain(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more"
    )
    expect(html).not.toContain("<script>")
    expect(text).toContain("Hi Priya,\n\nFirst line\nsecond line\n\n<script>")
  })

  it("links addresses in the message and points the button at the site", () => {
    const { html, text } = renderUpdateEmail(content, complete, base)
    expect(html).toContain(
      '<a href="https://vboard.vosslabs.org/posts/a?b=1&amp;c=2" style="color:#C4421D;">https://vboard.vosslabs.org/posts/a?b=1&amp;c=2</a>.'
    )
    expect(html).toContain(
      '<a href="https://vboard.vosslabs.org/dashboard/profile" style="display:inline-block'
    )
    expect(text).toContain(
      "Update your profile: https://vboard.vosslabs.org/dashboard/profile"
    )
  })

  it("leaves the button out when none is chosen and falls back for a blank name", () => {
    const { html, text } = renderUpdateEmail(
      { ...content, button: "none" },
      { name: "  " },
      base
    )
    expect(html).not.toContain("display:inline-block;background:#0A0A0A")
    expect(text).not.toContain("Update your profile")
    expect(html).toContain("Hi there,")
  })
})

describe("updateFormSchema", () => {
  const valid = {
    sendId: "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11",
    subject: " Profile update ",
    message: " Please add your number. ",
    audience: "incomplete",
    button: "profile",
    intent: "send",
  }

  it("trims the subject and message", () => {
    expect(updateFormSchema.parse(valid)).toMatchObject({
      subject: "Profile update",
      message: "Please add your number.",
    })
  })

  it.each([
    { subject: "Hi" },
    { message: "   " },
    { message: "x".repeat(4001) },
    { audience: "leads" },
    { button: "https://example.org" },
    { intent: "schedule" },
    { sendId: "not-a-uuid" },
    { recipients: "someone@example.org" },
  ])("rejects %o", (change) => {
    expect(updateFormSchema.safeParse({ ...valid, ...change }).success).toBe(
      false
    )
  })
})
