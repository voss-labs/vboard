import { sql } from "drizzle-orm"
import { domainPolicies } from "@/db/schema/rls"
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import type { RegistrationQuestion } from "@/lib/registration-form"
import { user } from "./auth"
import { community } from "./communities"
import {
  locationVisibilityEnum,
  postStatusEnum,
  postVisibilityEnum,
} from "./enums"

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => community.id, { onDelete: "restrict" }),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    visibility: postVisibilityEnum("visibility").notNull().default("public"),
    isPinned: boolean("is_pinned").notNull().default(false),
    status: postStatusEnum("status").notNull().default("draft"),
    isEvent: boolean("is_event").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    locationVisibility: locationVisibilityEnum("location_visibility"),
    registrationOpensAt: timestamp("registration_opens_at", {
      withTimezone: true,
    }),
    registrationClosesAt: timestamp("registration_closes_at", {
      withTimezone: true,
    }),
    capacity: integer("capacity"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    registrationQuestions: jsonb("registration_questions")
      .$type<RegistrationQuestion[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("post"),
    check(
      "post_event_shape",
      sql`(is_event AND starts_at IS NOT NULL AND location_visibility IS NOT NULL) OR (NOT is_event AND starts_at IS NULL AND ends_at IS NULL AND location IS NULL AND location_visibility IS NULL AND registration_opens_at IS NULL AND registration_closes_at IS NULL AND capacity IS NULL AND NOT requires_approval)`
    ),
    check("post_capacity_positive", sql`capacity IS NULL OR capacity > 0`),
    check(
      "post_dates_order",
      sql`(ends_at IS NULL OR ends_at >= starts_at) AND (registration_opens_at IS NULL OR registration_closes_at IS NULL OR registration_closes_at >= registration_opens_at)`
    ),
    check(
      "post_questions_shape",
      sql`jsonb_typeof(registration_questions) = 'array' AND (is_event OR registration_questions = '[]'::jsonb)`
    ),
    index("post_community_idx").on(t.communityId),
    index("post_status_idx").on(t.status),
    index("post_starts_at_idx").on(t.startsAt),
  ]
).enableRLS()
