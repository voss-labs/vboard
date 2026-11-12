"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { withDb, type DbContext } from "@/db"
import {
  createPost,
  deletePost,
  getPostById,
  setPostPinned,
  setPostStatus,
  updatePost,
} from "@/db/queries/posts"
import {
  decideRegistrations,
  listRegistrations,
} from "@/db/queries/registrations"
import { firstIssue, postFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { readImage } from "@/lib/media"
import { withMediaUpload } from "@/lib/media-upload"
import { keepsAnsweredQuestions } from "@/lib/registration-form"
import { randomSuffix, uniqueSlug } from "@/lib/slug"
import {
  actionCommunityAccess,
  actionPostAccess,
  type CommunityAccess,
} from "@/lib/session"

function readPostForm(formData: FormData) {
  const get = (key: string) => String(formData.get(key) ?? "")
  return postFormSchema.safeParse({
    title: get("title"),
    body: get("body"),
    visibility: get("visibility"),
    isPinned: get("isPinned"),
    isEvent: get("isEvent"),
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    location: get("location"),
    locationVisibility: get("locationVisibility") || "public",
    registrationOpensAt: get("registrationOpensAt"),
    registrationClosesAt: get("registrationClosesAt"),
    capacity: get("capacity"),
    requiresApproval: get("requiresApproval"),
    registrationQuestions: get("registrationQuestions"),
    intent: get("intent") || "save",
  })
}
function revalidateCommunity(slug: string, postSlug?: string) {
  revalidatePath(`/dashboard/c/${slug}`, "layout")
  revalidatePath(`/communities/${slug}`)
  revalidatePath("/")
  if (postSlug) revalidatePath(`/posts/${postSlug}`)
}
async function postInCommunity(
  ctx: DbContext,
  access: CommunityAccess,
  postId: unknown
) {
  const id = z.uuid().safeParse(postId)
  if (!id.success) return null
  const post = await getPostById(ctx, id.data)
  return post?.communityId === access.community.id ? post : null
}
export async function createPostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(formData.get("slug"), "post:write")
  if (!access) return fail("You cannot post in this community.")
  const parsed = readPostForm(formData)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { intent, ...data } = parsed.data
  if (intent === "publish" && !access.can("post:publish"))
    return fail("You cannot publish here.")
  const poster = await readImage(formData.get("posterFile"), "poster")
  if (!poster.ok) return fail(poster.error)
  let createdId = ""
  const result = await attemptAction(() =>
    withMediaUpload("poster", access.community.id, poster.data, (imageUrl) =>
      withDb({ userId: access.user.id }, async (ctx) => {
        const created = await createPost(ctx, {
          ...data,
          imageUrl,
          slug: uniqueSlug(data.title, randomSuffix()),
          communityId: access.community.id,
          status: intent === "publish" ? "published" : "draft",
        })
        createdId = created.id
        return done()
      })
    )
  )
  if (!result.ok) return result
  revalidateCommunity(access.community.slug)
  redirect(`/dashboard/c/${access.community.slug}/posts/${createdId}`)
}
export async function updatePostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:write"
  )
  if (!access) return fail("You cannot edit posts in this community.")
  const parsed = readPostForm(formData)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { intent: _intent, ...data } = parsed.data
  const removal = z
    .enum(["on", ""])
    .safeParse(formData.get("removePoster") ?? "")
  if (!removal.success) return fail("Choose whether to remove the poster.")
  const poster = await readImage(formData.get("posterFile"), "poster")
  if (!poster.ok) return fail(poster.error)
  if (removal.data === "on" && poster.data)
    return fail("Choose a poster or remove the current one, then save.")
  let postSlug = "",
    postId = ""
  const result = await attemptAction(() =>
    withMediaUpload("poster", access.community.id, poster.data, (uploaded) =>
      withDb({ userId: access.user.id }, async (ctx) => {
        const post = await postInCommunity(ctx, access, formData.get("postId"))
        if (!post) return fail("Post not found.")
        const answers = post.isEvent
          ? (await listRegistrations(ctx, post.id)).map((row) => row.answers)
          : []
        if (
          answers.length > 0 &&
          !keepsAnsweredQuestions(
            post.registrationQuestions,
            data.registrationQuestions,
            answers
          )
        )
          return fail(
            "Students have already answered this form. You can reword questions and choices, but not remove a question, change its type or remove a choice someone picked."
          )
        await updatePost(ctx, access.community.id, post.id, {
          ...data,
          imageUrl: removal.data === "on" ? null : (uploaded ?? undefined),
        })
        postSlug = post.slug
        postId = post.id
        return done()
      })
    )
  )
  if (!result.ok) return result
  revalidateCommunity(access.community.slug, postSlug)
  redirect(`/dashboard/c/${access.community.slug}/posts/${postId}`)
}
export async function setPostStatusAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const status = z
    .enum(["published", "draft", "cancelled", "completed"])
    .safeParse(formData.get("status"))
  if (!status.success) return fail("Unknown status.")
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:publish"
  )
  if (!access) return fail("You cannot change this post.")
  let postSlug = ""
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const post = await postInCommunity(ctx, access, formData.get("postId"))
      if (!post) return fail("Post not found.")
      await setPostStatus(ctx, access.community.id, post.id, status.data)
      postSlug = post.slug
      return done(
        `Post ${status.data === "draft" ? "moved to drafts" : status.data}.`
      )
    })
  )
  if (result.ok) revalidateCommunity(access.community.slug, postSlug)
  return result
}
export async function togglePinAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:publish"
  )
  if (!access) return fail("You cannot pin posts here.")
  let postSlug = ""
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const post = await postInCommunity(ctx, access, formData.get("postId"))
      if (!post) return fail("Post not found.")
      await setPostPinned(ctx, access.community.id, post.id, !post.isPinned)
      postSlug = post.slug
      return done(
        post.isPinned ? "Unpinned." : "Pinned to the top of the feed."
      )
    })
  )
  if (result.ok) revalidateCommunity(access.community.slug, postSlug)
  return result
}
export async function deletePostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:delete"
  )
  if (!access) return fail("You cannot remove posts here.")
  let postSlug = ""
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const post = await postInCommunity(ctx, access, formData.get("postId"))
      if (!post) return fail("Post not found.")
      await deletePost(ctx, access.community.id, post.id)
      postSlug = post.slug
      return done()
    })
  )
  if (!result.ok) return result
  revalidateCommunity(access.community.slug, postSlug)
  redirect(`/dashboard/c/${access.community.slug}`)
}
const DECISIONS = {
  approve: "registration:decide",
  reject: "registration:decide",
  checkin: "registration:checkin",
  noshow: "registration:checkin",
  reset: "registration:checkin",
} as const
export async function decideRegistrationsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = z
    .object({
      decision: z.enum(["approve", "reject", "checkin", "noshow", "reset"]),
      ids: z.array(z.uuid()).min(1).max(500),
    })
    .strict()
    .safeParse({
      decision: formData.get("decision"),
      ids: formData.getAll("registrationId"),
    })
  if (!parsed.success) return fail("Select valid registrations and an action.")
  const access = await actionCommunityAccess(
    formData.get("slug"),
    DECISIONS[parsed.data.decision]
  )
  if (!access) return fail("You do not have permission for that.")
  let postSlug = ""
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const post = await postInCommunity(ctx, access, formData.get("postId"))
      if (!post?.isEvent) return fail("Event not found.")
      await decideRegistrations(ctx, {
        postId: post.id,
        ids: parsed.data.ids,
        decision: parsed.data.decision,
      })
      postSlug = post.slug
      return done("Registrations updated.")
    })
  )
  if (result.ok) revalidateCommunity(access.community.slug, postSlug)
  return result
}
