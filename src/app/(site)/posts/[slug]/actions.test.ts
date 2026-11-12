import { beforeEach, describe, expect, it, vi } from "vitest"
import { registerAction } from "@/app/(site)/posts/[slug]/actions"

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  withDb: vi.fn(),
  questions: vi.fn(),
  register: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }))
vi.mock("@/db/queries/registrations", () => ({
  cancelRegistration: vi.fn(),
  getEventQuestions: mocks.questions,
  registerForEvent: mocks.register,
}))

const ctx = { actorId: "verified-student", tx: {} }
const student = {
  id: "verified-student",
  rollNumber: "24102A0054",
  department: "CMPN",
  cohortYear: 2024,
  phone: "9876543210",
}
function form() {
  const data = new FormData()
  data.set("postId", "20000000-0000-4000-8000-000000000021")
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
  mocks.questions.mockResolvedValue([])
  mocks.register.mockResolvedValue({ status: "approved" })
})

describe("registering needs a finished profile", () => {
  it.each([
    [{ ...student, rollNumber: null }],
    [{ ...student, cohortYear: null }],
    [{ ...student, phone: null }],
    [{ ...student, rollNumber: "220189" }],
  ])("refuses %o before touching the database", async (user) => {
    mocks.session.mockResolvedValue(user)
    const result = await registerAction(null, form())
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("Finish your profile"),
    })
    expect(mocks.withDb).not.toHaveBeenCalled()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it("registers a student whose profile is complete", async () => {
    mocks.session.mockResolvedValue(student)
    expect((await registerAction(null, form())).ok).toBe(true)
    expect(mocks.register).toHaveBeenCalledWith(
      ctx,
      "20000000-0000-4000-8000-000000000021",
      {}
    )
  })
})
