import { beforeEach, describe, expect, it, vi } from "vitest"
import { updateProfileAction } from "@/app/dashboard/profile/actions"

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  withDb: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }))
vi.mock("@/db/queries/profiles", () => ({ updateProfile: mocks.update }))

const ctx = { actorId: "verified-student", tx: {} }
function form(rollNumber = "23108A0054") {
  const data = new FormData()
  data.set("rollNumber", rollNumber)
  data.set("year", "3")
  data.set("bio", " Student builder ")
  return data
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-11-11T06:00:00Z"))
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ id: "verified-student" })
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
})

describe("profile roll-number save", () => {
  it("requires a session before accessing the database", async () => {
    mocks.session.mockResolvedValue(null)
    expect((await updateProfileAction(null, form())).ok).toBe(false)
    expect(mocks.withDb).not.toHaveBeenCalled()
  })

  it("derives department and normalizes the roll using verified identity", async () => {
    const data = form(" 23105a0054 ")
    data.set("department", "CMPN")
    data.set("division", "C")
    data.set("userId", "another-student")
    expect((await updateProfileAction(null, data)).ok).toBe(true)
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "verified-student" },
      expect.any(Function)
    )
    expect(mocks.update).toHaveBeenCalledWith(ctx, {
      rollNumber: "23105A0054",
      department: "BIOMED",
      cohortYear: 2024,
      phone: null,
      bio: "Student builder",
    })
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout")
  })

  it.each(["22101", "23999A0001", "23108C0001", "23104C0001"])(
    "rejects invalid or unsupported roll %s before a write",
    async (roll) => {
      expect((await updateProfileAction(null, form(roll))).ok).toBe(false)
      expect(mocks.withDb).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    }
  )

  it("clears derived department with an empty roll", async () => {
    const data = form("")
    data.set("department", "CIVIL")
    expect((await updateProfileAction(null, data)).ok).toBe(true)
    expect(mocks.update).toHaveBeenCalledWith(ctx, {
      rollNumber: null,
      department: null,
      cohortYear: null,
      phone: null,
      bio: "Student builder",
    })
  })

  it("rejects a year outside first to fourth before a write", async () => {
    const data = form()
    data.set("year", "FE")
    expect((await updateProfileAction(null, data)).ok).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("rejects oversized bio before a write", async () => {
    const data = form()
    data.set("bio", "x".repeat(401))
    expect((await updateProfileAction(null, data)).ok).toBe(false)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
