import { eq, inArray, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { profile } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import { projectionRows, requireActor } from "@/db/queries/projections"

export async function ensureProfile(ctx: DbContext) {
  const userId = requireActor(ctx)
  const rows = await ctx.tx
    .insert(profile)
    .values({ userId })
    .onConflictDoNothing()
    .returning()
  if (rows.length)
    await createAuditLog(ctx, {
      action: "profile.created",
      targetType: "profile",
      targetId: userId,
    })
}
export async function getProfile(ctx: DbContext, userId: string) {
  return (
    (
      await ctx.tx.select().from(profile).where(eq(profile.userId, userId))
    )[0] ?? null
  )
}
export async function updateProfile(
  ctx: DbContext,
  data: {
    rollNumber: string | null
    department: string | null
    cohortYear: number | null
    phone: string | null
    bio: string | null
  }
) {
  const userId = requireActor(ctx)
  await ctx.tx
    .insert(profile)
    .values({ userId, ...data })
    .onConflictDoUpdate({ target: profile.userId, set: data })
  await createAuditLog(ctx, {
    action: "profile.updated",
    targetType: "profile",
    targetId: userId,
  })
}
export async function isSuperAdmin(ctx: DbContext) {
  const result = await ctx.tx.execute<{ allowed: boolean }>(
    sql`select vboard_api.is_super_admin() as allowed`
  )
  return result.rows[0]?.allowed ?? false
}
export async function getUserByEmail(
  ctx: DbContext,
  email: string,
  communityId?: string
) {
  return (
    (
      await projectionRows<{ id: string; name: string; email: string }>(
        ctx,
        sql`select data from vboard_api.person_by_email(${email}, ${communityId ?? null}::uuid) data`
      )
    )[0] ?? null
  )
}
export async function listPeople(ctx: DbContext, search: string, limit = 50) {
  return projectionRows<{
    id: string
    name: string
    email: string
    createdAt: Date
    siteRole: "super_admin" | "student"
    rollNumber: string | null
    department: string | null
  }>(
    ctx,
    sql`select data from vboard_api.people(${search.trim()}, ${limit}) data`
  )
}
export async function listProfileContacts(ctx: DbContext, userIds: string[]) {
  if (userIds.length === 0) return []
  return ctx.tx
    .select({
      userId: profile.userId,
      cohortYear: profile.cohortYear,
      phone: profile.phone,
    })
    .from(profile)
    .where(inArray(profile.userId, userIds))
}
export async function countUsers(ctx: DbContext) {
  const result = await ctx.tx.execute<{ data: { users: number } }>(
    sql`select vboard_api.platform_counts() data`
  )
  return result.rows[0].data.users
}
