import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  decideRegistrationsAction,
  setPostStatusAction,
  updatePostAction,
} from "@/app/dashboard/c/[slug]/posts/actions"

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  withDb: vi.fn(),
  getPostById: vi.fn(),
  setPostStatus: vi.fn(),
  decideRegistrations: vi.fn(),
  hasRegistrations: vi.fn(),
  updatePost: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({
  actionCommunityAccess: mocks.access,
  actionPostAccess: mocks.access,
}))
vi.mock("@/db/queries/posts", () => ({
  getPostById: mocks.getPostById,
  setPostStatus: mocks.setPostStatus,
  createPost: vi.fn(),
  deletePost: vi.fn(),
  setPostPinned: vi.fn(),
  updatePost: mocks.updatePost,
}))
vi.mock("@/db/queries/registrations", () => ({
  decideRegistrations: mocks.decideRegistrations,
  hasRegistrations: mocks.hasRegistrations,
}))
const postId = "c7c1339b-cf14-471a-96e8-82d8f93901df"
const registrationId = "b6ec664f-9905-4d39-b5c0-fc3434dc6b81"
const ctx = { actorId: "verified-user", tx: {} }
function form(fields: Record<string, string | string[]>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields))
    for (const entry of Array.isArray(value) ? value : [value])
      data.append(key, entry)
  return data
}
const question = {
  id: "5b0c4a0e-6d1f-4c58-9d7e-2f3a1b4c5d6e",
  type: "choice" as const,
  label: "Which role?",
  required: true,
  options: ["Frontend", "Backend"],
}
function editForm(questions: unknown[]) {
  return form({
    slug: "club-a",
    postId,
    title: "Interview day",
    body: "Bring a laptop.",
    visibility: "public",
    isEvent: "on",
    startsAt: "2030-01-01T10:00",
    endsAt: "2030-01-01T12:00",
    locationVisibility: "public",
    registrationQuestions: JSON.stringify(questions),
    intent: "save",
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.access.mockResolvedValue({
    user: { id: "verified-user" },
    community: { id: "community-a", slug: "club-a" },
    can: () => true,
  })
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
  mocks.getPostById.mockResolvedValue({
    id: postId,
    communityId: "community-a",
    slug: "event-a",
    isEvent: true,
    registrationQuestions: [question],
  })
})
describe("registration question edits", () => {
  it("refuses to drop an answered question and saves nothing", async () => {
    mocks.hasRegistrations.mockResolvedValue(true)
    const result = await updatePostAction(null, editForm([]))
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("already answered"),
    })
    expect(mocks.updatePost).not.toHaveBeenCalled()
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
  it("refuses to drop an answered choice", async () => {
    mocks.hasRegistrations.mockResolvedValue(true)
    const result = await updatePostAction(
      null,
      editForm([{ ...question, options: ["Frontend", "Design"] }])
    )
    expect(result.ok).toBe(false)
    expect(mocks.updatePost).not.toHaveBeenCalled()
  })
  it("saves added choices and questions after students have answered", async () => {
    mocks.hasRegistrations.mockResolvedValue(true)
    const next = [
      {
        ...question,
        label: "Which team?",
        options: [...question.options, "Design"],
      },
      {
        id: "0f6f8f52-6a43-4a57-8c0e-7b1d2e3f4a5b",
        type: "text",
        label: "About you",
        required: false,
        minWords: 0,
        maxWords: 300,
      },
    ]
    await updatePostAction(null, editForm(next))
    expect(mocks.updatePost).toHaveBeenCalledWith(
      ctx,
      "community-a",
      postId,
      expect.objectContaining({ registrationQuestions: next })
    )
  })
  it("lets any question go while nobody has registered", async () => {
    mocks.hasRegistrations.mockResolvedValue(false)
    await updatePostAction(null, editForm([]))
    expect(mocks.updatePost).toHaveBeenCalledWith(
      ctx,
      "community-a",
      postId,
      expect.objectContaining({ registrationQuestions: [] })
    )
  })
})
describe("event action ownership boundary", () => {
  it("rejects an event from another community even for an actor who operates both", async () => {
    mocks.getPostById.mockResolvedValue({
      id: postId,
      communityId: "community-b",
    })
    const result = await setPostStatusAction(
      null,
      form({ slug: "club-a", postId, status: "published" })
    )
    expect(result.ok).toBe(false)
    expect(mocks.setPostStatus).not.toHaveBeenCalled()
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
  it("uses verified identity and exact community in the mutation", async () => {
    await setPostStatusAction(
      null,
      form({
        slug: "club-a",
        postId,
        status: "published",
        userId: "forged-user",
        communityId: "community-b",
      })
    )
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "verified-user" },
      expect.any(Function)
    )
    expect(mocks.setPostStatus).toHaveBeenCalledWith(
      ctx,
      "community-a",
      postId,
      "published"
    )
  })
  it("passes the full submitted batch to one atomic domain operation", async () => {
    const second = "08116243-476f-425b-b551-c590281474ab"
    await decideRegistrationsAction(
      null,
      form({
        slug: "club-a",
        postId,
        decision: "approve",
        registrationId: [registrationId, second],
      })
    )
    expect(mocks.decideRegistrations).toHaveBeenCalledOnce()
    expect(mocks.decideRegistrations).toHaveBeenCalledWith(ctx, {
      postId,
      ids: [registrationId, second],
      decision: "approve",
    })
  })
  it("returns a safe failure and does not revalidate when SQL denies a stale grant", async () => {
    mocks.decideRegistrations.mockRejectedValue(
      new Error("private database details")
    )
    const result = await decideRegistrationsAction(
      null,
      form({ slug: "club-a", postId, decision: "approve", registrationId })
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain("private database details")
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
})
