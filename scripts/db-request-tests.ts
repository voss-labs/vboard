import assert from "node:assert/strict"
import type { Pool } from "pg"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import {
  decideCommunityRequest,
  hasPendingCommunityRequest,
  listOwnCommunityRequests,
  listPendingCommunityRequests,
  submitCommunityRequest,
  withdrawCommunityRequest,
} from "@/db/queries/community-requests"

export async function testCommunityRequests(owner: Pool, app: Pool) {
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
  const request = (slug: string) => ({
    name: "Robotics Club",
    slug,
    description: "Robots and drones",
    purpose: "Weekly build nights and one competition each term.",
    contactPhone: "9876543210",
    contactEmail: "robotics@vit.edu.in",
  })
  const stored = async (id: string) =>
    (
      await owner.query(
        "SELECT status,community_id,decided_by,decision_note,decided_at FROM public.community_request WHERE id=$1",
        [id]
      )
    ).rows[0]
  const audits = async (id: string) =>
    (
      await owner.query(
        "SELECT action FROM public.audit_log WHERE target_type='community_request' AND target_id=$1 ORDER BY created_at",
        [id]
      )
    ).rows.map((row) => row.action)
  const raw = (actorId: string, query: ReturnType<typeof sql>) =>
    asActor(actorId, (ctx) => ctx.tx.execute(query))

  await assert.rejects(
    asActor(null, (ctx) => submitCommunityRequest(ctx, request("robotics")))
  )
  await assert.rejects(
    asActor("student", (ctx) => submitCommunityRequest(ctx, request("two")))
  )
  await assert.rejects(
    asActor("student", (ctx) =>
      submitCommunityRequest(ctx, { ...request("robotics"), purpose: "short" })
    )
  )
  await assert.rejects(
    raw(
      "student",
      sql`insert into public.community_request(requester_id,name,slug,purpose,contact_phone,contact_email) values('student2','Robotics Club','robotics','Weekly build nights and one competition each term.','9876543210','robotics@vit.edu.in')`
    )
  )
  await assert.rejects(
    raw(
      "student",
      sql`insert into public.community_request(requester_id,name,slug,purpose,contact_phone,contact_email,status) values('student','Robotics Club','robotics','Weekly build nights and one competition each term.','9876543210','robotics@vit.edu.in','approved')`
    )
  )
  for (const contact of [
    { contactPhone: "12345" },
    { contactPhone: "+919876543210" },
    { contactEmail: "not-an-email" },
    { contactEmail: "Robotics@vit.edu.in" },
  ])
    await assert.rejects(
      asActor("student", (ctx) =>
        submitCommunityRequest(ctx, { ...request("robotics"), ...contact })
      )
    )
  assert.equal(
    (await owner.query("SELECT count(*)::int n FROM public.community_request"))
      .rows[0].n,
    0
  )

  const first = await asActor("student", (ctx) =>
    submitCommunityRequest(ctx, request("robotics"))
  )
  assert.equal((await stored(first.id)).status, "pending")
  assert.deepEqual(await audits(first.id), ["community_request.submitted"])
  assert.equal(
    await asActor("student", (ctx) => hasPendingCommunityRequest(ctx)),
    true
  )
  await assert.rejects(
    asActor("student", (ctx) => submitCommunityRequest(ctx, request("drones")))
  )
  assert.equal(
    (await asActor("student", (ctx) => listOwnCommunityRequests(ctx))).length,
    1
  )
  for (const actor of ["student2", "organizer", "lead"]) {
    assert.equal(
      (
        await asActor(actor, (ctx) =>
          ctx.tx
            .select()
            .from(schema.communityRequest)
            .where(eq(schema.communityRequest.id, first.id))
        )
      ).length,
      0
    )
    await assert.rejects(
      asActor(actor, (ctx) => listPendingCommunityRequests(ctx))
    )
    await assert.rejects(
      asActor(actor, (ctx) =>
        decideCommunityRequest(ctx, {
          id: first.id,
          decision: "approve",
          note: null,
        })
      )
    )
    await assert.rejects(
      asActor(actor, (ctx) => withdrawCommunityRequest(ctx, first.id))
    )
  }
  await assert.rejects(
    raw(
      "student",
      sql`update public.community_request set status='approved',decided_by='student' where id=${first.id}::uuid`
    )
  )
  await assert.rejects(
    raw(
      "student",
      sql`update public.community_request set name='Renamed' where id=${first.id}::uuid`
    )
  )
  await assert.rejects(
    raw(
      "student",
      sql`update public.community_request set contact_phone='9123456789' where id=${first.id}::uuid`
    )
  )
  await assert.rejects(
    raw(
      "super",
      sql`update public.community_request set status='approved',decided_by='super' where id=${first.id}::uuid`
    )
  )
  assert.equal((await stored(first.id)).status, "pending")

  const pending = await asActor("super", (ctx) =>
    listPendingCommunityRequests(ctx)
  )
  assert.equal(pending.length, 1)
  assert.equal(pending[0].requesterEmail, "student@vit.edu.in")
  assert.equal(pending[0].contactPhone, "9876543210")
  assert.equal(pending[0].contactEmail, "robotics@vit.edu.in")
  assert.equal(pending[0].slugTaken, false)

  const created = await asActor("super", (ctx) =>
    decideCommunityRequest(ctx, {
      id: first.id,
      decision: "approve",
      note: null,
    })
  )
  assert.equal(created?.slug, "robotics")
  const approved = await stored(first.id)
  assert.equal(approved.status, "approved")
  assert.equal(approved.community_id, created?.id)
  assert.equal(approved.decided_by, "super")
  assert.ok(approved.decided_at)
  assert.deepEqual(
    (
      await owner.query(
        "SELECT user_id,role,is_active FROM public.community_member WHERE community_id=$1",
        [created?.id]
      )
    ).rows,
    [{ user_id: "student", role: "lead", is_active: true }]
  )
  assert.deepEqual(await audits(first.id), [
    "community_request.submitted",
    "community_request.approved",
  ])
  await assert.rejects(
    asActor("super", (ctx) =>
      decideCommunityRequest(ctx, {
        id: first.id,
        decision: "reject",
        note: null,
      })
    )
  )
  await assert.rejects(
    asActor("student", (ctx) => withdrawCommunityRequest(ctx, first.id))
  )
  await assert.rejects(
    asActor("student2", (ctx) =>
      submitCommunityRequest(ctx, request("robotics"))
    )
  )

  const second = await asActor("student2", (ctx) =>
    submitCommunityRequest(ctx, request("drones"))
  )
  await asActor("student2", (ctx) => withdrawCommunityRequest(ctx, second.id))
  assert.equal((await stored(second.id)).status, "withdrawn")
  await assert.rejects(
    asActor("super", (ctx) =>
      decideCommunityRequest(ctx, {
        id: second.id,
        decision: "approve",
        note: null,
      })
    )
  )
  const third = await asActor("student2", (ctx) =>
    submitCommunityRequest(ctx, request("drones"))
  )
  assert.equal(
    await asActor("super", (ctx) =>
      decideCommunityRequest(ctx, {
        id: third.id,
        decision: "reject",
        note: "Join Robotics Club instead.",
      })
    ),
    null
  )
  const rejected = await stored(third.id)
  assert.equal(rejected.status, "rejected")
  assert.equal(rejected.community_id, null)
  assert.equal(rejected.decision_note, "Join Robotics Club instead.")
  assert.deepEqual(
    (await asActor("student2", (ctx) => listOwnCommunityRequests(ctx))).map(
      (row) => [row.status, row.decisionNote]
    ),
    [
      ["rejected", "Join Robotics Club instead."],
      ["withdrawn", null],
    ]
  )
  assert.equal(
    (
      await owner.query(
        "SELECT count(*)::int n FROM public.community WHERE slug='drones'"
      )
    ).rows[0].n,
    0
  )
}
