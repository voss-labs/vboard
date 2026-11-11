import { and, eq, inArray, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { registration } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import type {
  RegistrationAnswers,
  RegistrationQuestion,
} from "@/lib/registration-form"
import {
  projectionRows,
  requireActor,
  requireRow,
} from "@/db/queries/projections"

export async function getRegistration(
  ctx: DbContext,
  postId: string,
  userId: string
) {
  return (
    (
      await ctx.tx
        .select()
        .from(registration)
        .where(
          and(eq(registration.postId, postId), eq(registration.userId, userId))
        )
    )[0] ?? null
  )
}
export async function getRegistrationById(ctx: DbContext, id: string) {
  return (
    (
      await ctx.tx.select().from(registration).where(eq(registration.id, id))
    )[0] ?? null
  )
}
async function eventScope(ctx: DbContext, postId: string) {
  const rows = await projectionRows<{
    communityId: string
    requiresApproval: boolean
    questions: RegistrationQuestion[]
  }>(
    ctx,
    sql`select data from vboard_api.registration_event(${postId}::uuid) data`
  )
  return requireRow(rows)
}
export async function getEventQuestions(ctx: DbContext, postId: string) {
  return (await eventScope(ctx, postId)).questions
}
export async function registerForEvent(
  ctx: DbContext,
  postId: string,
  answers: RegistrationAnswers = {}
) {
  const userId = requireActor(ctx)
  await ctx.tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${postId}::text, 0))`
  )
  const scope = await eventScope(ctx, postId)
  const existing = await getRegistration(ctx, postId, userId)
  const status = scope.requiresApproval ? "pending" : "approved"
  let rows: (typeof registration.$inferSelect)[]
  if (existing) {
    if (existing.status !== "cancelled")
      throw new Error("This registration cannot be retried")
    rows = await ctx.tx
      .update(registration)
      .set({
        status,
        answers,
        decidedBy: null,
        decidedAt: null,
        checkedInAt: null,
        registeredAt: new Date(),
      })
      .where(eq(registration.id, existing.id))
      .returning()
  } else {
    rows = await ctx.tx
      .insert(registration)
      .values({ postId, userId, status, answers })
      .returning()
  }
  const row = requireRow(rows)
  await createAuditLog(ctx, {
    action: "registration.created",
    targetType: "registration",
    targetId: row.id,
    communityId: scope.communityId,
  })
  return row
}
export async function cancelRegistration(ctx: DbContext, postId: string) {
  const userId = requireActor(ctx)
  const current = await getRegistration(ctx, postId, userId)
  if (!current || !["pending", "approved"].includes(current.status))
    throw new Error("This registration cannot be cancelled")
  const scope = await eventScope(ctx, postId)
  requireRow(
    await ctx.tx
      .update(registration)
      .set({ status: "cancelled" })
      .where(eq(registration.id, current.id))
      .returning()
  )
  await createAuditLog(ctx, {
    action: "registration.cancelled",
    targetType: "registration",
    targetId: current.id,
    communityId: scope.communityId,
  })
}
export type RegistrationDecision =
  "approve" | "reject" | "checkin" | "noshow" | "reset"
const DECISIONS = {
  approve: "approved",
  reject: "rejected",
  checkin: "attended",
  noshow: "no_show",
  reset: "approved",
} as const
const SOURCES = {
  approve: ["pending", "rejected"],
  reject: ["pending", "approved"],
  checkin: ["approved", "no_show"],
  noshow: ["approved"],
  reset: ["attended", "no_show"],
} as const
export async function decideRegistrations(
  ctx: DbContext,
  input: { postId: string; ids: string[]; decision: RegistrationDecision }
) {
  const actorId = requireActor(ctx)
  const ids = [...new Set(input.ids)]
  if (!ids.length) throw new Error("Select at least one registration")
  await ctx.tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${input.postId}::text, 0))`
  )
  const scope = await eventScope(ctx, input.postId)
  const allowed = await ctx.tx.execute<{ allowed: boolean }>(
    sql`select vboard_api.event_operator(${input.postId}::uuid) allowed`
  )
  if (!allowed.rows[0]?.allowed) throw new Error("Event access denied")
  const rows = await ctx.tx
    .select()
    .from(registration)
    .where(inArray(registration.id, ids))
    .for("update")
  if (
    rows.length !== ids.length ||
    rows.some(
      (row) =>
        row.postId !== input.postId ||
        !(SOURCES[input.decision] as readonly string[]).includes(row.status)
    )
  )
    throw new Error("The selected registrations cannot receive this decision")
  await ctx.tx
    .update(registration)
    .set({
      status: DECISIONS[input.decision],
      decidedBy: actorId,
      decidedAt: new Date(),
      checkedInAt: input.decision === "checkin" ? new Date() : null,
    })
    .where(inArray(registration.id, ids))
  for (const row of rows)
    await createAuditLog(ctx, {
      action: `registration.${input.decision}`,
      targetType: "registration",
      targetId: row.id,
      communityId: scope.communityId,
    })
}
export async function listRegistrations(ctx: DbContext, postId: string) {
  return projectionRows<{
    id: string
    status: typeof registration.$inferSelect.status
    registeredAt: Date
    checkedInAt: Date | null
    userId: string
    name: string
    email: string
    rollNumber: string | null
    department: string | null
    answers: RegistrationAnswers
  }>(
    ctx,
    sql`select data from vboard_api.event_attendees(${postId}::uuid) data`
  )
}
export async function listUserRegistrations(ctx: DbContext, userId: string) {
  return projectionRows<{
    id: string
    status: typeof registration.$inferSelect.status
    registeredAt: Date
    checkedInAt: Date | null
    postId: string
    postSlug: string
    title: string
    startsAt: Date | null
    endsAt: Date | null
    postStatus: "draft" | "published" | "cancelled" | "completed" | "hidden"
    isActive: boolean
    communityName: string
  }>(ctx, sql`select data from vboard_api.registration_history(${userId}) data`)
}
export async function listPendingForCommunities(
  ctx: DbContext,
  communityIds: string[]
) {
  if (!communityIds.length) return []
  return projectionRows<{
    id: string
    registeredAt: Date
    name: string
    postId: string
    title: string
    communityId: string
    communitySlug: string
  }>(
    ctx,
    sql`select data from vboard_api.scoped_pending_registrations(${sql.param(communityIds)}::uuid[]) data`
  )
}
export async function countRegistrations(ctx: DbContext) {
  const result = await ctx.tx.execute<{ data: { registrations: number } }>(
    sql`select vboard_api.platform_counts() data`
  )
  return result.rows[0].data.registrations
}
