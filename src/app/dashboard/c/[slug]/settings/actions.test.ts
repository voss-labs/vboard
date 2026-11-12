import { beforeEach, describe, expect, it, vi } from "vitest"
import { updateCommunityAction } from "@/app/dashboard/c/[slug]/settings/actions"

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  withDb: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  discard: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({ actionCommunityAccess: mocks.access }))
vi.mock("@/db/queries/communities", () => ({ updateCommunity: mocks.update }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/object-storage", () => ({
  uploadMedia: mocks.upload,
  discardMedia: mocks.discard,
}))

const communityId = "c7c1339b-cf14-471a-96e8-82d8f93901df"
const key = `community-logos/${communityId}/08116243-476f-425b-b551-c590281474ab.png`
const reference = `neon://vboard/${key}`
const ctx = { actorId: "verified-user", tx: {} }
function form(upload = false) {
  const data = new FormData()
  data.set("slug", "club-a")
  data.set("name", "Club A")
  data.set("description", "Public club description")
  data.set("logoUrl", "")
  if (upload)
    data.set(
      "logoFile",
      new File([Buffer.from("89504e470d0a1a0a", "hex")], "../forged.svg", {
        type: "image/png",
      })
    )
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.access.mockResolvedValue({
    user: { id: "verified-user" },
    community: { id: communityId, slug: "club-a", logoUrl: reference },
  })
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
  mocks.upload.mockResolvedValue({ key, reference })
})

describe("community logo settings action", () => {
  it("denies before file or storage access when capability is missing", async () => {
    mocks.access.mockResolvedValue(null)
    const data = form(true)
    data.set("logoFile", "invalid")
    expect((await updateCommunityAction(null, data)).ok).toBe(false)
    expect(mocks.access).toHaveBeenCalledWith("club-a", "community:update")
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.withDb).not.toHaveBeenCalled()
  })

  it("validates bytes and rejects forged stored pointers before storage writes", async () => {
    const badImage = form()
    badImage.set(
      "logoFile",
      new File(["<html>"], "logo.png", { type: "image/png" })
    )
    expect((await updateCommunityAction(null, badImage)).ok).toBe(false)
    const forged = form(true)
    forged.set("logoUrl", "neon://vboard/another-community.png")
    expect((await updateCommunityAction(null, forged)).ok).toBe(false)
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each(["not a url", "http://", "javascript:alert(1)"])(
    "returns validation failure for malformed or unsupported URL %s",
    async (value) => {
      const data = form(true)
      data.set("logoUrl", value)
      await expect(updateCommunityAction(null, data)).resolves.toMatchObject({
        ok: false,
      })
      expect(mocks.upload).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    }
  )

  it("uses server identity and community, then persists the uploaded key", async () => {
    const data = form(true)
    data.set("communityId", "forged-community")
    data.set("userId", "forged-user")
    expect((await updateCommunityAction(null, data)).ok).toBe(true)
    expect(mocks.upload).toHaveBeenCalledWith(
      "logo",
      communityId,
      expect.objectContaining({ contentType: "image/png", extension: "png" })
    )
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "verified-user" },
      expect.any(Function)
    )
    expect(mocks.update).toHaveBeenCalledWith(ctx, communityId, {
      name: "Club A",
      description: "Public club description",
      logoUrl: reference,
    })
    expect(mocks.discard).not.toHaveBeenCalled()
    expect(mocks.revalidate).toHaveBeenCalledWith("/communities/club-a")
  })

  it("preserves the current managed logo when no replacement is selected", async () => {
    await updateCommunityAction(null, form())
    expect(mocks.update).toHaveBeenCalledWith(
      ctx,
      communityId,
      expect.objectContaining({ logoUrl: reference })
    )
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("accepts an external URL and explicit removal without deleting old objects", async () => {
    const external = form()
    external.set("logoUrl", "https://images.example.org/logo.png")
    await updateCommunityAction(null, external)
    expect(mocks.update).toHaveBeenLastCalledWith(
      ctx,
      communityId,
      expect.objectContaining({
        logoUrl: "https://images.example.org/logo.png",
      })
    )
    const removal = form()
    removal.set("removeLogo", "on")
    await updateCommunityAction(null, removal)
    expect(mocks.update).toHaveBeenLastCalledWith(
      ctx,
      communityId,
      expect.objectContaining({ logoUrl: null })
    )
    expect(mocks.discard).not.toHaveBeenCalled()
  })

  it("rejects simultaneous upload and removal before storage access", async () => {
    const data = form(true)
    data.set("removeLogo", "on")
    expect((await updateCommunityAction(null, data)).ok).toBe(false)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("cleans up only the new object when RLS rejects a stale grant", async () => {
    mocks.update.mockRejectedValue(new Error("private SQL details"))
    const result = await updateCommunityAction(null, form(true))
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain("private SQL details")
    expect(mocks.discard).toHaveBeenCalledExactlyOnceWith(key)
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })

  it("returns a safe failure before database writes when upload fails", async () => {
    mocks.upload.mockRejectedValue(new Error("secret storage credentials"))
    const result = await updateCommunityAction(null, form(true))
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain("secret storage credentials")
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.discard).not.toHaveBeenCalled()
  })
})
