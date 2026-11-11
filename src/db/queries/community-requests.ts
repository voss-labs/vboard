import { and, desc, eq, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { community, communityRequest } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import { createCommunity } from "@/db/queries/communities"
import { isSuperAdmin } from "@/db/queries/profiles"
import {
  projectionRows,
  requireActor,
  requireRow,
} from "@/db/queries/projections"

export type CommunityRequestStatus = typeof communityRequest.$inferSelect.status

async function audit(ctx: DbContext, action: string, id: string) {
  await createAuditLog(ctx, {
    action: `community_request.${action}`,
    targetType: "community_request",
    targetId: id,
  })
}

export async function listOwnCommunityRequests(ctx: DbContext) {
  return ctx.tx
    .select({
      id: communityRequest.id,
      name: communityRequest.name,
      slug: communityRequest.slug,
      contactPhone: communityRequest.contactPhone,
      contactEmail: communityRequest.contactEmail,
      status: communityRequest.status,
      decisionNote: communityRequest.decisionNote,
      createdAt: communityRequest.createdAt,
      decidedAt: communityRequest.decidedAt,
    })
    .from(communityRequest)
    .where(eq(communityRequest.requesterId, requireActor(ctx)))
    .orderBy(desc(communityRequest.createdAt))
}

export async function listPendingCommunityRequests(ctx: DbContext) {
  return projectionRows<{
    id: string
    name: string
    slug: string
    description: string
    purpose: string
    contactPhone: string
    contactEmail: string
    status: CommunityRequestStatus
    createdAt: Date
    requesterName: string
    requesterEmail: string
    slugTaken: boolean
  }>(ctx, sql`select data from vboard_api.community_requests() data`)
}

export async function hasPendingCommunityRequest(ctx: DbContext) {
  const rows = await ctx.tx
    .select({ id: communityRequest.id })
    .from(communityRequest)
    .where(
      and(
        eq(communityRequest.requesterId, requireActor(ctx)),
        eq(communityRequest.status, "pending")
      )
    )
  return rows.length > 0
}

export async function submitCommunityRequest(
  ctx: DbContext,
  data: {
    name: string
    slug: string
    description: string
    purpose: string
    contactPhone: string
    contactEmail: string
  }
) {
  const row = requireRow(
    await ctx.tx
      .insert(communityRequest)
      .values({ ...data, requesterId: requireActor(ctx) })
      .returning({ id: communityRequest.id })
  )
  await audit(ctx, "submitted", row.id)
  return row
}

export async function withdrawCommunityRequest(ctx: DbContext, id: string) {
  requireRow(
    await ctx.tx
      .update(communityRequest)
      .set({ status: "withdrawn" })
      .where(
        and(
          eq(communityRequest.id, id),
          eq(communityRequest.requesterId, requireActor(ctx)),
          eq(communityRequest.status, "pending")
        )
      )
      .returning({ id: communityRequest.id })
  )
  await audit(ctx, "withdrawn", id)
}

export async function decideCommunityRequest(
  ctx: DbContext,
  input: { id: string; decision: "approve" | "reject"; note: string | null }
) {
  const decidedBy = requireActor(ctx)
  if (!(await isSuperAdmin(ctx))) throw new Error("Platform access denied")
  const request = requireRow(
    await ctx.tx
      .select()
      .from(communityRequest)
      .where(eq(communityRequest.id, input.id))
      .for("update")
  )
  if (request.status !== "pending")
    throw new Error("This community request is already closed")
  if (input.decision === "reject") {
    await ctx.tx
      .update(communityRequest)
      .set({ status: "rejected", decidedBy, decisionNote: input.note })
      .where(eq(communityRequest.id, request.id))
    await audit(ctx, "rejected", request.id)
    return null
  }
  const taken = await ctx.tx
    .select({ id: community.id })
    .from(community)
    .where(eq(community.slug, request.slug))
  if (taken.length) throw new Error("That community address is taken")
  const created = await createCommunity(ctx, {
    slug: request.slug,
    name: request.name,
    description: request.description,
    leadUserId: request.requesterId,
  })
  await ctx.tx
    .update(communityRequest)
    .set({
      status: "approved",
      decidedBy,
      decisionNote: input.note,
      communityId: created.id,
    })
    .where(eq(communityRequest.id, request.id))
  await audit(ctx, "approved", request.id)
  return created
}
