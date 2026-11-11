import { beforeEach, describe, expect, it, vi } from "vitest"
import { sendUpdateAction } from "@/app/dashboard/admin/updates/actions"

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  withDb: vi.fn(),
  recipients: vi.fn(),
  record: vi.fn(),
  configured: vi.fn(),
  send: vi.fn(),
  devAuth: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.user }))
vi.mock("@/lib/dev-auth-gate", () => ({ devAuthEnabled: mocks.devAuth }))
vi.mock("@/db/queries/updates", () => ({
  listUpdateRecipients: mocks.recipients,
  recordUpdateSent: mocks.record,
}))
vi.mock("@/lib/resend", () => ({
  emailConfigured: mocks.configured,
  sendEmails: mocks.send,
}))

const sendId = "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11"
const ctx = { actorId: "admin", tx: {} }
const admin = {
  id: "admin",
  name: "Asha Rao",
  email: "asha@vit.edu.in",
  siteRole: "super_admin",
}
const person = (id: string, phone: string | null) => ({
  id,
  name: `Person ${id}`,
  email: `${id}@vit.edu.in`,
  rollNumber: "23102A0054",
  department: "CMPN",
  cohortYear: 2023,
  phone,
})
function form(fields: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    sendId,
    subject: "Profile update",
    message: "Please add your contact number.",
    audience: "incomplete",
    button: "profile",
    intent: "send",
    ...fields,
  }))
    data.set(key, value)
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv("BETTER_AUTH_URL", "https://vboard.vosslabs.org")
  mocks.user.mockResolvedValue(admin)
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
  mocks.recipients.mockResolvedValue([
    person("a", "9876543210"),
    person("b", null),
    person("c", null),
  ])
  mocks.configured.mockReturnValue(true)
  mocks.devAuth.mockReturnValue(false)
  mocks.send.mockImplementation(async (emails: unknown[]) => ({
    sent: emails.length,
    failure: null,
  }))
})

describe("send update action", () => {
  it("refuses anyone who is not Super admin before reading recipients", async () => {
    for (const user of [null, { ...admin, siteRole: "student" }]) {
      mocks.user.mockResolvedValue(user)
      expect((await sendUpdateAction(null, form())).ok).toBe(false)
    }
    expect(mocks.recipients).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("rejects recipients or addresses supplied by the browser", async () => {
    const result = await sendUpdateAction(
      null,
      form({ audience: "someone@example.org" })
    )
    expect(result.ok).toBe(false)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("sends a test only to the signed-in admin and records nothing", async () => {
    const result = await sendUpdateAction(null, form({ intent: "test" }))
    expect(result).toEqual({
      ok: true,
      message: "Test sent to asha@vit.edu.in.",
    })
    const [emails, key] = mocks.send.mock.calls[0]
    expect(emails).toHaveLength(1)
    expect(emails[0].to).toBe("asha@vit.edu.in")
    expect(emails[0].html).toContain("Hi Asha,")
    expect(key).toBeUndefined()
    expect(mocks.recipients).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
  })

  it("emails only the chosen audience, each by name, and records the send", async () => {
    const result = await sendUpdateAction(null, form())
    expect(result).toEqual({ ok: true, message: "Update sent to 2 people." })
    const [emails, key] = mocks.send.mock.calls[0]
    expect(emails.map((email: { to: string }) => email.to)).toEqual([
      "b@vit.edu.in",
      "c@vit.edu.in",
    ])
    expect(emails[0].html).toContain("Hi Person,")
    expect(key).toBe(sendId)
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "admin" },
      expect.any(Function)
    )
    expect(mocks.record).toHaveBeenCalledWith(ctx, {
      id: sendId,
      subject: "Profile update",
      audience: "incomplete",
      recipients: 2,
      sent: 2,
    })
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/admin/audit")
  })

  it("reports a partial send and still records what went out", async () => {
    mocks.send.mockResolvedValue({ sent: 1, failure: "Resend answered 422." })
    const result = await sendUpdateAction(null, form())
    expect(result).toEqual({
      ok: false,
      error: "Sent to 1 of 2 people. Resend answered 422.",
    })
    expect(mocks.record).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ recipients: 2, sent: 1 })
    )
  })

  it("says so when the send went out but could not be recorded", async () => {
    mocks.record.mockRejectedValue(new Error("private SQL details"))
    const result = await sendUpdateAction(null, form())
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).toContain("Do not send it again")
    expect(JSON.stringify(result)).not.toContain("private SQL details")
  })

  it("does not send without an API key, to an empty audience, or to seeded accounts", async () => {
    mocks.configured.mockReturnValue(false)
    expect((await sendUpdateAction(null, form())).ok).toBe(false)
    mocks.configured.mockReturnValue(true)
    mocks.recipients.mockResolvedValue([person("a", "9876543210")])
    expect((await sendUpdateAction(null, form())).ok).toBe(false)
    mocks.devAuth.mockReturnValue(true)
    expect(
      (await sendUpdateAction(null, form({ audience: "everyone" }))).ok
    ).toBe(false)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
  })
})
