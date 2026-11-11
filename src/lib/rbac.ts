export type SiteRole = "super_admin" | "student"
export type CommunityRole = "lead" | "organizer"

export type SiteCapability =
  | "community:create"
  | "community:archive"
  | "community:assignLead"
  | "user:read"
  | "post:moderate"
  | "audit:read"

export type CommunityCapability =
  | "community:update"
  | "member:read"
  | "member:manage"
  | "post:read"
  | "post:write"
  | "post:publish"
  | "post:delete"
  | "registration:read"
  | "registration:decide"
  | "registration:checkin"
  | "registration:export"

export const SITE_ROLE_LABEL: Record<SiteRole, string> = {
  super_admin: "Super admin",
  student: "Student",
}
export const COMMUNITY_ROLE_LABEL: Record<CommunityRole, string> = {
  lead: "Lead",
  organizer: "Organizer",
}
const ORGANIZER: CommunityCapability[] = [
  "post:read",
  "post:write",
  "post:publish",
  "post:delete",
  "registration:read",
  "registration:decide",
  "registration:checkin",
  "registration:export",
]
const COMMUNITY_CAPABILITIES: Record<
  CommunityRole,
  ReadonlySet<CommunityCapability>
> = {
  organizer: new Set(ORGANIZER),
  lead: new Set([
    ...ORGANIZER,
    "community:update",
    "member:read",
    "member:manage",
  ]),
}
export const COMMUNITY_ROLE_RANK: Record<CommunityRole, number> = {
  lead: 2,
  organizer: 1,
}
export function isSiteAdmin(role: SiteRole): boolean {
  return role === "super_admin"
}
export function siteCan(role: SiteRole, _capability: SiteCapability): boolean {
  return role === "super_admin"
}
export function communityCan(
  siteRole: SiteRole,
  role: CommunityRole | null,
  capability: CommunityCapability
): boolean {
  return (
    siteRole === "super_admin" ||
    (role !== null && COMMUNITY_CAPABILITIES[role].has(capability))
  )
}
export function communityCapabilities(
  siteRole: SiteRole,
  role: CommunityRole | null
): ReadonlySet<CommunityCapability> {
  return siteRole === "super_admin"
    ? COMMUNITY_CAPABILITIES.lead
    : role
      ? COMMUNITY_CAPABILITIES[role]
      : new Set()
}
export function assignableCommunityRoles(
  siteRole: SiteRole,
  role: CommunityRole | null
): CommunityRole[] {
  if (siteCan(siteRole, "community:assignLead")) return ["lead", "organizer"]
  return role === "lead" ? ["organizer"] : []
}
export function canChangeMember(
  actor: { siteRole: SiteRole; communityRole: CommunityRole | null },
  target: { role: CommunityRole; isSelf: boolean }
): boolean {
  if (siteCan(actor.siteRole, "community:assignLead")) return true
  return (
    actor.communityRole === "lead" &&
    target.role === "organizer" &&
    !target.isSelf
  )
}
