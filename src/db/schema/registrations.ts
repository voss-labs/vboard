import { sql } from "drizzle-orm"
import { domainPolicies } from "@/db/schema/rls"
import type { RegistrationAnswers } from "@/lib/registration-form"
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { registrationStatusEnum } from "./enums"
import { post } from "./posts"

export const registration = pgTable(
  "registration",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: registrationStatusEnum("status").notNull().default("pending"),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    answers: jsonb("answers")
      .$type<RegistrationAnswers>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("registration"),
    check("registration_answers_shape", sql`jsonb_typeof(answers) = 'object'`),
    uniqueIndex("registration_unique").on(t.postId, t.userId),
    index("registration_user_idx").on(t.userId),
  ]
).enableRLS()
