import assert from "node:assert/strict"
import type { Pool } from "pg"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import { listUpdateRecipients, recordUpdateSent } from "@/db/queries/updates"

export async function testUpdateRecipients(owner: Pool, app: Pool) {
  const db = drizzle(app, { schema })
  const asActor = <T>(
    actorId: string | null,
    work: (ctx: DbContext) => Promise<T>
  ) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('vboard.actor_id', ${actorId ?? ""}, true)`
      )
      return work({ tx, actorId })
    })
  const update = {
    id: "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11",
    subject: "Profile update",
    audience: "everyone" as const,
    recipients: 3,
    sent: 3,
  }

  for (const actor of [null, "student", "organizer"]) {
    await assert.rejects(asActor(actor, listUpdateRecipients))
    await assert.rejects(asActor(actor, (ctx) => recordUpdateSent(ctx, update)))
  }

  const users = (
    await owner.query('SELECT id,email FROM public."user" ORDER BY id')
  ).rows
  const recipients = await asActor("super", listUpdateRecipients)
  assert.deepEqual(
    recipients.map((r) => [r.id, r.email]).sort(),
    users.map((row) => [row.id, row.email]).sort()
  )
  assert.deepEqual(Object.keys(recipients[0]).sort(), [
    "cohortYear",
    "department",
    "email",
    "id",
    "name",
    "phone",
    "rollNumber",
  ])

  await asActor("super", (ctx) => recordUpdateSent(ctx, update))
  assert.deepEqual(
    (
      await owner.query(
        "SELECT actor_id,action,details FROM public.audit_log WHERE target_type='update' AND target_id=$1",
        [update.id]
      )
    ).rows,
    [
      {
        actor_id: "super",
        action: "update.sent",
        details: {
          subject: "Profile update",
          audience: "everyone",
          recipients: 3,
          sent: 3,
        },
      },
    ]
  )
}
