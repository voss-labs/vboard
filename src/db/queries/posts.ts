import { and, eq, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { post } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import {
  projectionRows,
  requireActor,
  requireRow,
} from "@/db/queries/projections"

export type FeedPost = Omit<typeof post.$inferSelect, "authorId"> & {
  communitySlug: string
  communityName: string
  authorName: string | null
  authorImage: string | null
  seatsTaken: number
  pendingCount: number
}
export type PostInput = Pick<
  typeof post.$inferInsert,
  | "title"
  | "body"
  | "visibility"
  | "isPinned"
  | "isEvent"
  | "startsAt"
  | "endsAt"
  | "location"
  | "locationVisibility"
  | "registrationOpensAt"
  | "registrationClosesAt"
  | "capacity"
  | "requiresApproval"
  | "registrationQuestions"
>
export type DashboardEventWhen = "all" | "upcoming" | "past"
export type DashboardEventStatus = "all" | typeof post.$inferSelect.status

export async function listFeed(
  ctx: DbContext,
  opts: { communityId?: string } = {}
) {
  return projectionRows<FeedPost>(
    ctx,
    sql`select data from vboard_api.feed_posts(${opts.communityId ?? null}::uuid) data`
  )
}
export async function listEvents(ctx: DbContext) {
  return projectionRows<FeedPost>(
    ctx,
    sql`select data from vboard_api.calendar_events() data`
  )
}
export async function getPostDetailBySlug(ctx: DbContext, slug: string) {
  return (
    (
      await projectionRows<FeedPost>(
        ctx,
        sql`select data from vboard_api.post_detail(${slug}) data`
      )
    )[0] ?? null
  )
}
export async function getPostById(ctx: DbContext, id: string) {
  return (
    (
      await ctx.tx
        .select()
        .from(post)
        .where(and(eq(post.id, id), eq(post.isActive, true)))
    )[0] ?? null
  )
}
export async function getSeatsTaken(ctx: DbContext, postId: string) {
  return (
    (
      await ctx.tx.execute<{ n: number | null }>(
        sql`select vboard_api.event_seats(${postId}::uuid) n`
      )
    ).rows[0]?.n ?? 0
  )
}
export async function listCommunityPosts(ctx: DbContext, communityId: string) {
  return projectionRows<FeedPost>(
    ctx,
    sql`select data from vboard_api.community_posts(${communityId}::uuid) data`
  )
}
export async function createPost(
  ctx: DbContext,
  data: PostInput & {
    slug: string
    communityId: string
    status: "draft" | "published"
    imageUrl?: string | null
  }
) {
  const row = requireRow(
    await ctx.tx
      .insert(post)
      .values({ ...data, authorId: requireActor(ctx) })
      .returning({ id: post.id })
  )
  await createAuditLog(ctx, {
    action: "post.created",
    targetType: "post",
    targetId: row.id,
    communityId: data.communityId,
  })
  return row
}
async function changePost(
  ctx: DbContext,
  communityId: string,
  id: string,
  data: Partial<typeof post.$inferInsert>,
  action: string
) {
  requireRow(
    await ctx.tx
      .update(post)
      .set(data)
      .where(
        and(
          eq(post.id, id),
          eq(post.communityId, communityId),
          eq(post.isActive, true)
        )
      )
      .returning({ id: post.id })
  )
  await createAuditLog(ctx, {
    action,
    targetType: "post",
    targetId: id,
    communityId,
  })
}
export async function updatePost(
  ctx: DbContext,
  communityId: string,
  id: string,
  data: PostInput & { imageUrl?: string | null }
) {
  await changePost(ctx, communityId, id, data, "post.updated")
}
export async function setPostStatus(
  ctx: DbContext,
  communityId: string,
  id: string,
  status: typeof post.$inferSelect.status
) {
  await changePost(ctx, communityId, id, { status }, "post.status")
}
export async function setPostPinned(
  ctx: DbContext,
  communityId: string,
  id: string,
  isPinned: boolean
) {
  await changePost(ctx, communityId, id, { isPinned }, "post.pinned")
}
export async function deletePost(
  ctx: DbContext,
  communityId: string,
  id: string
) {
  await changePost(ctx, communityId, id, { isActive: false }, "post.deleted")
}
export async function listDashboardEvents(
  ctx: DbContext,
  opts: {
    q: string
    communitySlug: string | null
    when: DashboardEventWhen
    status: DashboardEventStatus
    now: Date
  }
) {
  return projectionRows<FeedPost>(
    ctx,
    sql`select data from vboard_api.dashboard_events(${opts.q.trim()},${opts.communitySlug},${opts.when},${opts.status === "all" ? null : opts.status}::public.post_status,${opts.now.toISOString()}::timestamptz) data`
  )
}
export async function listUpcomingEventsForCommunities(
  ctx: DbContext,
  communityIds: string[],
  now = new Date()
) {
  if (!communityIds.length) return []
  return projectionRows<FeedPost>(
    ctx,
    sql`select data from vboard_api.upcoming_events(${sql.param(communityIds)}::uuid[],${now.toISOString()}::timestamptz) data`
  )
}
export async function countPublishedPosts(ctx: DbContext) {
  const result = await ctx.tx.execute<{
    data: { posts: number; events: number }
  }>(sql`select vboard_api.published_counts() data`)
  return result.rows[0].data
}
export async function countEventsBetween(ctx: DbContext, from: Date, to: Date) {
  const result = await ctx.tx.execute<{ data: { eventsBetween: number } }>(
    sql`select vboard_api.published_counts(${from.toISOString()}::timestamptz,${to.toISOString()}::timestamptz) data`
  )
  return result.rows[0].data.eventsBetween
}
