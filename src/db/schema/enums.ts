import { pgEnum } from "drizzle-orm/pg-core"

export const communityRoleEnum = pgEnum("community_role", ["lead", "organizer"])

export const postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "vit_only",
])

export const locationVisibilityEnum = pgEnum("location_visibility", [
  "public",
  "after_approval",
])

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
  "hidden",
])

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "attended",
  "no_show",
])

export const communityRequestStatusEnum = pgEnum("community_request_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
])
