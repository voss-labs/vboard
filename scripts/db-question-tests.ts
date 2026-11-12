import assert from "node:assert/strict"
import type { Pool } from "pg"
import { eq, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import { getPostDetailBySlug } from "@/db/queries/posts"
import { updateProfile } from "@/db/queries/profiles"
import {
  cancelRegistration,
  decideRegistrations,
  getEventQuestions,
  getRegistration,
  listRegistrations,
  registerForEvent,
} from "@/db/queries/registrations"
import {
  answerLabels,
  type RegistrationAnswers,
  type RegistrationQuestion,
} from "@/lib/registration-form"
import { adminFixture } from "./db-security-tests"
import { IDS } from "./db-test-fixtures"

const ROLE = "40000000-0000-4000-8000-000000000001"
const ABOUT = "40000000-0000-4000-8000-000000000002"
const YEAR = "40000000-0000-4000-8000-000000000003"
const UNKNOWN = "40000000-0000-4000-8000-000000000099"
const FRONTEND = {
  id: "40000000-0000-4000-8000-00000000000a",
  label: "Frontend",
}
const BACKEND = { id: "40000000-0000-4000-8000-00000000000b", label: "Backend" }
const DESIGN = { id: "40000000-0000-4000-8000-00000000000c", label: "Design" }
const SE = { id: "40000000-0000-4000-8000-00000000000d", label: "SE" }
const TE = { id: "40000000-0000-4000-8000-00000000000e", label: "TE" }

export async function testRegistrationQuestions(owner: Pool, app: Pool) {
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
  const event = "20000000-0000-4000-8000-000000000021"
  const note = "20000000-0000-4000-8000-000000000022"
  const role: RegistrationQuestion = {
    id: ROLE,
    type: "choice",
    label: "Role",
    required: true,
    options: [FRONTEND, BACKEND],
  }
  const about: RegistrationQuestion = {
    id: ABOUT,
    type: "text",
    label: "About you",
    required: false,
    minWords: 3,
    maxWords: 5,
  }
  const questions = [role, about]
  const saveRaw = (actorId: string, postId: string, value: unknown) =>
    asActor(actorId, (ctx) =>
      ctx.tx.execute(
        sql`update public.post set registration_questions=${JSON.stringify(value)}::jsonb where id=${postId}::uuid`
      )
    )
  const save = (actorId: string, value: RegistrationQuestion[]) =>
    asActor(actorId, (ctx) =>
      ctx.tx
        .update(schema.post)
        .set({ registrationQuestions: value })
        .where(eq(schema.post.id, event))
        .returning({ questions: schema.post.registrationQuestions })
    )
  const stored = async (postId: string) =>
    (
      await owner.query(
        "SELECT registration_questions FROM public.post WHERE id=$1",
        [postId]
      )
    ).rows[0].registration_questions
  const row = async (id: string) =>
    (
      await owner.query(
        "SELECT status,answers FROM public.registration WHERE id=$1",
        [id]
      )
    ).rows[0] as { status: string; answers: Record<string, string> }

  await adminFixture(owner, async (client) => {
    await client.query(
      "UPDATE public.community_member SET is_active=true WHERE id=$1",
      [IDS.organizer]
    )
    await client.query(
      "INSERT INTO public.community_member(community_id,user_id,role) VALUES($1,'outsider','organizer')",
      [IDS.otherCommunity]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,requires_approval)
      VALUES($1::uuid,$1::text,$2,'organizer','Interview','Body','published',true,now()+interval '1 day',now()+interval '2 days','public',true)`,
      [event, IDS.community]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status)
      VALUES($1::uuid,$1::text,$2,'organizer','Note','Body','published')`,
      [note, IDS.community]
    )
  })
  assert.deepEqual(await stored(event), [])

  for (const malformed of [
    { id: ROLE },
    ["Role"],
    [{ ...role, options: [FRONTEND] }],
    [{ ...role, options: ["Frontend", "Backend"] }],
    [{ ...role, options: [FRONTEND, { ...BACKEND, label: "Frontend" }] }],
    [{ ...role, options: [FRONTEND, { ...BACKEND, id: FRONTEND.id }] }],
    [{ ...role, options: [FRONTEND, { ...BACKEND, id: "backend" }] }],
    [{ ...role, options: [FRONTEND, { ...BACKEND, label: " " }] }],
    [role, { ...about, id: ROLE }],
    [{ id: ABOUT, type: "text", label: "About you", required: false }],
    [{ ...about, minWords: 6, maxWords: 5 }],
    [{ ...role, id: "role" }],
    [{ ...role, label: " " }],
    [{ ...role, required: "yes" }],
    [{ ...role, type: "upload" }],
  ])
    await assert.rejects(saveRaw("organizer", event, malformed))
  assert.deepEqual(await stored(event), [])
  await assert.rejects(saveRaw("organizer", note, questions))
  assert.deepEqual(await stored(note), [])
  assert.deepEqual(await save("student", questions), [])
  assert.deepEqual(await save("outsider", questions), [])
  assert.deepEqual(await stored(event), [])

  assert.deepEqual(await save("organizer", questions), [{ questions }])
  assert.deepEqual(await stored(event), questions)
  assert.deepEqual(
    (await asActor(null, (ctx) => getPostDetailBySlug(ctx, event)))
      ?.registrationQuestions,
    questions
  )
  assert.deepEqual(
    await asActor("student", (ctx) => getEventQuestions(ctx, event)),
    questions
  )
  assert.deepEqual(
    await asActor("organizer", (ctx) => listRegistrations(ctx, event)),
    []
  )

  const invalidAnswers: RegistrationAnswers[] = [
    {},
    { [ABOUT]: "one two three" },
    { [ROLE]: DESIGN.id },
    { [ROLE]: "Frontend" },
    { [ROLE]: FRONTEND.id, [ABOUT]: "one two" },
    { [ROLE]: FRONTEND.id, [ABOUT]: "one two three four five six" },
    { [ROLE]: FRONTEND.id, [ABOUT]: "" },
    { [ROLE]: FRONTEND.id, [ABOUT]: " one two three " },
    { [ROLE]: FRONTEND.id, [UNKNOWN]: "extra" },
  ]
  for (const invalid of invalidAnswers)
    await assert.rejects(
      asActor("student2", (ctx) => registerForEvent(ctx, event, invalid))
    )
  assert.equal(
    (
      await owner.query(
        "SELECT count(*)::int n FROM public.registration WHERE post_id=$1",
        [event]
      )
    ).rows[0].n,
    0
  )

  const answers = { [ROLE]: FRONTEND.id, [ABOUT]: "I build web apps" }
  const first = await asActor("student", (ctx) =>
    registerForEvent(ctx, event, answers)
  )
  assert.equal(first.status, "pending")
  assert.deepEqual(first.answers, answers)
  assert.deepEqual(await row(first.id), { status: "pending", answers })
  const changed = JSON.stringify({ [ROLE]: BACKEND.id })
  for (const actor of ["student", "organizer", "super"])
    await assert.rejects(
      asActor(actor, (ctx) =>
        ctx.tx.execute(
          sql`update public.registration set answers=${changed}::jsonb where id=${first.id}::uuid`
        )
      )
    )
  assert.deepEqual((await row(first.id)).answers, answers)

  assert.deepEqual(
    (await asActor("student", (ctx) => getRegistration(ctx, event, "student")))
      ?.answers,
    answers
  )
  for (const actor of ["student2", "outsider"])
    assert.equal(
      (
        await asActor(actor, (ctx) =>
          ctx.tx
            .select()
            .from(schema.registration)
            .where(eq(schema.registration.id, first.id))
        )
      ).length,
      0
    )
  for (const actor of ["student", "student2", "outsider"])
    await assert.rejects(asActor(actor, (ctx) => listRegistrations(ctx, event)))
  await assert.rejects(asActor(null, (ctx) => listRegistrations(ctx, event)))
  for (const actor of ["organizer", "lead", "super"]) {
    const attendees = await asActor(actor, (ctx) =>
      listRegistrations(ctx, event)
    )
    assert.equal(attendees.length, 1)
    assert.equal(attendees[0].userId, "student")
    assert.deepEqual(attendees[0].answers, answers)
  }
  const details = {
    rollNumber: "23102A0054",
    department: "CMPN",
    phone: "9876543210",
    bio: "Builds backend services",
  }
  await asActor("student", (ctx) =>
    updateProfile(ctx, { ...details, cohortYear: 2023 })
  )
  const [reviewed] = await asActor("organizer", (ctx) =>
    listRegistrations(ctx, event)
  )
  assert.equal(reviewed.cohortYear, 2023)
  assert.equal(reviewed.phone, details.phone)
  assert.equal(reviewed.bio, details.bio)
  await assert.rejects(
    asActor("student", (ctx) =>
      updateProfile(ctx, { ...details, cohortYear: 2023, phone: "12345" })
    )
  )
  await assert.rejects(
    asActor("student", (ctx) =>
      updateProfile(ctx, { ...details, cohortYear: 1999 })
    )
  )

  await assert.rejects(save("organizer", [role]))
  await assert.rejects(save("organizer", []))
  await assert.rejects(
    save("organizer", [
      { ...about, id: ROLE, label: "Role" },
      { ...about, id: ABOUT },
    ])
  )
  await assert.rejects(
    save("organizer", [{ ...role, options: [BACKEND, DESIGN] }, about])
  )
  assert.deepEqual(await stored(event), questions)
  const reworded: RegistrationQuestion[] = [
    { ...role, options: [{ ...FRONTEND, label: "Web" }, DESIGN] },
    about,
  ]
  assert.deepEqual(await save("organizer", reworded), [{ questions: reworded }])
  assert.deepEqual(await stored(event), reworded)
  assert.deepEqual((await row(first.id)).answers, answers)
  assert.deepEqual(
    (await asActor("organizer", (ctx) => listRegistrations(ctx, event)))[0]
      .answers,
    answers
  )
  assert.equal(
    answerLabels(reworded, (await row(first.id)).answers)[ROLE],
    "Web"
  )
  await assert.rejects(
    asActor("student2", (ctx) =>
      registerForEvent(ctx, event, { [ROLE]: BACKEND.id })
    )
  )
  await asActor("organizer", (ctx) =>
    decideRegistrations(ctx, {
      postId: event,
      ids: [first.id],
      decision: "reject",
    })
  )
  assert.deepEqual(await row(first.id), { status: "rejected", answers })
  const widened: RegistrationQuestion[] = [
    {
      ...role,
      label: "Preferred role",
      options: [FRONTEND, BACKEND, DESIGN],
    },
    { ...about, label: "A little about you" },
    {
      id: YEAR,
      type: "choice",
      label: "Year",
      required: false,
      options: [SE, TE],
    },
  ]
  assert.deepEqual(await save("organizer", widened), [{ questions: widened }])
  assert.deepEqual(await stored(event), widened)
  assert.deepEqual((await row(first.id)).answers, answers)

  await asActor("organizer", (ctx) =>
    decideRegistrations(ctx, {
      postId: event,
      ids: [first.id],
      decision: "approve",
    })
  )
  assert.deepEqual(await row(first.id), { status: "approved", answers })
  await asActor("student", (ctx) => cancelRegistration(ctx, event))
  assert.deepEqual(await row(first.id), { status: "cancelled", answers })
  await assert.rejects(
    asActor("student", (ctx) =>
      registerForEvent(ctx, event, { [ROLE]: UNKNOWN })
    )
  )
  assert.deepEqual(await row(first.id), { status: "cancelled", answers })
  const retried = { [ROLE]: DESIGN.id, [YEAR]: TE.id }
  const again = await asActor("student", (ctx) =>
    registerForEvent(ctx, event, retried)
  )
  assert.equal(again.id, first.id)
  assert.deepEqual(await row(first.id), { status: "pending", answers: retried })

  await adminFixture(owner, async (client) => {
    await client.query(
      "DELETE FROM public.community_member WHERE community_id=$1 AND user_id='outsider'",
      [IDS.otherCommunity]
    )
  })
}
