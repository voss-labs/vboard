import { domainPolicies } from "@/db/schema/rls"
import { sql } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { community } from "./communities"
import { communityRequestStatusEnum } from "./enums"

export const communityRequest = pgTable(
  "community_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    purpose: text("purpose").notNull(),
    contactPhone: text("contact_phone").notNull(),
    contactEmail: text("contact_email").notNull(),
    status: communityRequestStatusEnum("status").notNull().default("pending"),
    communityId: uuid("community_id").references(() => community.id, {
      onDelete: "restrict",
    }),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("community_request"),
    uniqueIndex("community_request_one_pending")
      .on(t.requesterId)
      .where(sql`${t.status} = 'pending'`),
    index("community_request_status_idx").on(t.status, t.createdAt),
  ]
).enableRLS()
