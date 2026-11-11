import { cache } from "react"
import { withDb } from "@/db"
import { getPostDetailBySlug } from "@/db/queries/posts"
import { getRegistration } from "@/db/queries/registrations"
import { isProfileComplete } from "@/lib/profile"
import { communityCan } from "@/lib/rbac"
import { registrationAvailability } from "@/lib/registration"
import { getSessionUser, getTrustedActor, roleIn } from "@/lib/session"

export const loadPostView = cache(async (slug: string) => {
  const actor = await getTrustedActor()
  const post = await withDb(actor, (ctx) => getPostDetailBySlug(ctx, slug))
  if (!post) return null
  const user = await getSessionUser()
  const role = user ? roleIn(user, post.communityId) : null
  const canManage = !!user && communityCan(user.siteRole, role, "post:read")
  if (post.status !== "published" && !canManage) return null
  const registration = user
    ? await withDb(actor, (ctx) => getRegistration(ctx, post.id, user.id))
    : null
  return {
    post,
    user,
    canManage,
    registration,
    status: registration?.status ?? null,
    availability: registrationAvailability(post, post.seatsTaken),
    profileComplete: !!user && isProfileComplete(user),
  }
})
