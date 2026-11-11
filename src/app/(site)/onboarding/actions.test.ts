import { beforeEach, describe, expect, it, vi } from "vitest"
import { completeOnboardingAction } from "@/app/(site)/onboarding/actions"

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  withDb: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }))
vi.mock("@/db/queries/profiles", () => ({ updateProfile: mocks.update }))

const ctx = { actorId: "verified-student", tx: {} }
function form(values: Record<string, string> = {}) {
  const data = new FormData()
  data.set("rollNumber", "24102a0054")
  data.set("year", "3")
  data.set("bio", " Builder ")
  data.set("next", "/posts/hack-night")
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"))
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ id: "verified-student" })
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
})

describe("completing onboarding", () => {
  it("requires a session before accessing the database", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await completeOnboardingAction(null, form())).ok).toBe(false)
    expect(mocks.withDb).not.toHaveBeenCalled()
  })

  it("saves derived details under the verified identity and returns to the event", async () => {
    await completeOnboardingAction(
      null,
      form({ department: "IT", userId: "another-student" })
    )
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "verified-student" },
      expect.any(Function)
    )
    expect(mocks.update).toHaveBeenCalledWith(ctx, {
      rollNumber: "24102A0054",
      department: "CMPN",
      cohortYear: 2024,
      bio: "Builder",
    })
    expect(mocks.redirect).toHaveBeenCalledWith("/posts/hack-night")
  })

  it.each([
    [{ rollNumber: "" }],
    [{ rollNumber: "220189" }],
    [{ year: "" }],
    [{ year: "5" }],
  ])("rejects %o before a write", async (values) => {
    expect((await completeOnboardingAction(null, form(values))).ok).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("never redirects off the site", async () => {
    await completeOnboardingAction(
      null,
      form({ next: "https://evil.example/steal" })
    )
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard")
  })
})
