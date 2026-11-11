import { domainPolicies } from "@/db/schema/rls"
import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "restrict" }),
    rollNumber: text("roll_number"),
    department: text("department"),
    cohortYear: integer("cohort_year"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("profile"),
    index("profile_roll_number_idx").on(t.rollNumber),
    check(
      "profile_cohort_year_range",
      sql`${t.cohortYear} IS NULL OR ${t.cohortYear} BETWEEN 2000 AND 2100`
    ),
  ]
).enableRLS()
