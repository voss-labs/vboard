import { sql } from "drizzle-orm"
import { pgPolicy, pgRole } from "drizzle-orm/pg-core"

export const appRole = pgRole("vboard_app").existing()
export const guardRole = pgRole("vboard_guard").existing()
const predicates = {
  profile: {
    select: "user_id=vboard_api.actor_id() OR vboard_api.is_super_admin()",
    insert: "user_id=vboard_api.actor_id()",
    update: "user_id=vboard_api.actor_id()",
  },
  community: {
    select: "is_active OR vboard_api.is_super_admin()",
    insert: "vboard_api.is_super_admin()",
    update: "vboard_api.leads(id)",
  },
  community_request: {
    select: "requester_id=vboard_api.actor_id() OR vboard_api.is_super_admin()",
    insert: "requester_id=vboard_api.actor_id()",
    update: "requester_id=vboard_api.actor_id() OR vboard_api.is_super_admin()",
  },
  member: {
    select: "user_id=vboard_api.actor_id() OR vboard_api.leads(community_id)",
    insert: "vboard_api.leads(community_id)",
    update: "vboard_api.leads(community_id)",
  },
  post: {
    select: "vboard_api.operates(community_id)",
    insert: "vboard_api.operates(community_id)",
    update: "vboard_api.operates(community_id)",
  },
  registration: {
    select:
      "user_id=vboard_api.actor_id() OR vboard_api.event_operator(post_id)",
    insert: "user_id=vboard_api.actor_id()",
    update:
      "user_id=vboard_api.actor_id() OR vboard_api.event_operator(post_id)",
  },
  audit: {
    select: "vboard_api.is_super_admin() OR vboard_api.operates(community_id)",
    insert:
      "actor_id=vboard_api.actor_id() AND vboard_api.audit_allowed(target_type,target_id,community_id)",
    update: null,
  },
} as const

export function domainPolicies(domain: keyof typeof predicates) {
  const rule = predicates[domain]
  return [
    pgPolicy("guard_read", { for: "select", to: guardRole, using: sql`true` }),
    pgPolicy(`${domain}_select`, {
      for: "select",
      to: appRole,
      using: sql.raw(rule.select),
    }),
    pgPolicy(`${domain}_insert`, {
      for: "insert",
      to: appRole,
      withCheck: sql.raw(rule.insert),
    }),
    ...(rule.update
      ? [
          pgPolicy(`${domain}_update`, {
            for: "update",
            to: appRole,
            using: sql.raw(rule.update),
            withCheck: sql.raw(rule.update),
          }),
        ]
      : []),
  ]
}
