import { cache } from "react"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { withDb, type DbActor } from "@/db"
import { ensureProfile, getProfile, isSuperAdmin } from "@/db/queries/profiles"
import {
  getCommunityBySlug,
  listMembershipsForUser,
} from "@/db/queries/communities"
import { auth, verifyAuthDatabase } from "@/lib/auth"
import { isVerifiedVitIdentity } from "@/lib/auth-config"
import { devIdentity } from "@/lib/dev-auth"
import {
  communityCan,
  communityCapabilities,
  siteCan,
  type CommunityCapability,
  type CommunityRole,
  type SiteCapability,
  type SiteRole,
} from "@/lib/rbac"

export type Membership = {
  communityId: string
  slug: string
  name: string
  role: CommunityRole
}
export type SessionUser = {
  id: string
  name: string
  email: string
  image: string | null
  siteRole: SiteRole
  rollNumber: string | null
  department: string | null
  cohortYear: number | null
  bio: string | null
  memberships: Membership[]
}
const getIdentity = cache(async () => {
  const requestHeaders = await headers()
  const dev = await devIdentity()
  if (dev) return dev
  await verifyAuthDatabase()
  const session = await auth.api.getSession({ headers: requestHeaders })
  return session?.user && isVerifiedVitIdentity(session.user)
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null
})
export async function getTrustedActor(): Promise<DbActor | null> {
  const identity = await getIdentity()
  return identity ? { userId: identity.id } : null
}
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = await getIdentity()
  if (!identity) return null
  return withDb({ userId: identity.id }, async (ctx) => {
    await ensureProfile(ctx)
    const profile = await getProfile(ctx, identity.id)
    const memberships = await listMembershipsForUser(ctx, identity.id)
    return {
      ...identity,
      siteRole: (await isSuperAdmin(ctx)) ? "super_admin" : "student",
      rollNumber: profile?.rollNumber ?? null,
      department: profile?.department ?? null,
      cohortYear: profile?.cohortYear ?? null,
      bio: profile?.bio ?? null,
      memberships,
    }
  })
})
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}
export async function requireSiteCapability(
  capability: SiteCapability
): Promise<SessionUser> {
  const user = await requireUser()
  if (!siteCan(user.siteRole, capability)) notFound()
  return user
}
export function roleIn(
  user: SessionUser,
  communityId: string
): CommunityRole | null {
  return (
    user.memberships.find(
      (membership) => membership.communityId === communityId
    )?.role ?? null
  )
}
export type CommunityAccess = {
  user: SessionUser
  community: NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>
  role: CommunityRole | null
  capabilities: ReadonlySet<CommunityCapability>
  can: (capability: CommunityCapability) => boolean
}
export async function getCommunityAccess(
  user: SessionUser,
  slug: string
): Promise<CommunityAccess | null> {
  return withDb({ userId: user.id }, async (ctx) => {
    const community = await getCommunityBySlug(ctx, slug)
    if (!community) return null
    const superAdmin = await isSuperAdmin(ctx)
    if (!community.isActive && !superAdmin) return null
    const memberships = await listMembershipsForUser(ctx, user.id)
    const role =
      memberships.find((membership) => membership.communityId === community.id)
        ?.role ?? null
    const siteRole = superAdmin ? "super_admin" : "student"
    const capabilities = communityCapabilities(siteRole, role)
    if (!capabilities.size) return null
    return {
      user: { ...user, siteRole, memberships },
      community,
      role,
      capabilities,
      can: (capability) => communityCan(siteRole, role, capability),
    }
  })
}
export async function requireCommunityAccess(
  slug: string,
  capability: CommunityCapability = "post:read"
): Promise<CommunityAccess> {
  const access = await getCommunityAccess(await requireUser(), slug)
  if (!access?.can(capability)) notFound()
  return access
}
export async function actionCommunityAccess(
  slug: unknown,
  capability: CommunityCapability
): Promise<CommunityAccess | null> {
  if (typeof slug !== "string" || !slug) return null
  const user = await getSessionUser()
  if (!user) return null
  const access = await getCommunityAccess(user, slug)
  return access?.can(capability) ? access : null
}
export async function actionPostAccess(
  slug: unknown,
  _postId: unknown,
  capability: CommunityCapability
): Promise<CommunityAccess | null> {
  return actionCommunityAccess(slug, capability)
}
