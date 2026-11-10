import { config } from "dotenv"
config({ path: ".env.local" })

import { sql } from "drizzle-orm"
import { seedDb as db, seedPool } from "./lib/seed-db"
import {
  auditLog,
  community,
  communityMember,
  post,
  profile,
  registration,
} from "@/db/schema"
import { DEV_PERSONAS } from "@/lib/dev-personas"
import type { CommunityRole } from "@/lib/rbac"
import type { RegistrationStatus } from "@/lib/registration"
import { demoAnswers, demoDrafts, demoPosts, TEAM_FILL } from "./lib/demo"
import { communities, posts } from "./lib/fixtures"
import {
  DEPARTMENTS,
  registrationStatus,
  studentIdentity,
  upsertUser,
} from "./lib/seed-helpers"

const AUTHORS = [
  { name: "Devansh Shah", email: "devansh.shah@vit.edu.in" },
  { name: "Riya Kulkarni", email: "riya.kulkarni@vit.edu.in" },
  { name: "Karthik Iyer", email: "karthik.iyer@vit.edu.in" },
  { name: "Sneha Pawar", email: "sneha.pawar@vit.edu.in" },
]

const LEADS: { email: string; slug: string; role: CommunityRole }[] = [
  { email: "aarav.mehta@vit.edu.in", slug: "gdg-vit", role: "lead" },
  { email: "devansh.shah@vit.edu.in", slug: "coding-club", role: "lead" },
  { email: "sneha.iyer@vit.edu.in", slug: "coding-club", role: "organizer" },
  { email: "riya.kulkarni@vit.edu.in", slug: "drama-society", role: "lead" },
  { email: "karthik.iyer@vit.edu.in", slug: "chess-club", role: "lead" },
  { email: "sneha.pawar@vit.edu.in", slug: "ieee-vit", role: "lead" },
]

const PRIYA_PLAN: Record<string, RegistrationStatus> = {
  "build-with-gemma-4": "approved",
  "monsoon-monologues": "pending",
  "hackathon-night-2": "attended",
  "dsa-study-circle-week-3": "approved",
}

const STUDENT_COUNT = 90

async function run() {
  await db.transaction(async (db) => {
    const allowlist = await db.execute<{ configured: boolean }>(sql`
      select exists (select 1 from vboard_private.super_admin_email
        where email = ${DEV_PERSONAS[0].email}) as configured
    `)
    if (!allowlist.rows[0]?.configured) {
      throw new Error(
        "Provision the local Super admin persona email in SUPER_ADMIN_EMAILS before loading fixtures"
      )
    }
    await db.execute(sql`set local session_replication_role = replica`)
    await db.execute(
      sql`truncate ${registration}, ${post}, ${communityMember}, ${community}, ${auditLog} cascade`
    )

    const ids = new Map<string, string>()
    for (const p of [...DEV_PERSONAS, ...AUTHORS]) {
      ids.set(p.email, await upsertUser(db, p.name, p.email))
    }
    const students: string[] = []
    for (let i = 0; i < STUDENT_COUNT; i++) {
      const s = studentIdentity(i)
      students.push(await upsertUser(db, s.name, s.email))
    }

    const everyone = [...ids.values(), ...students]
    for (const [i, userId] of everyone.entries()) {
      await db
        .insert(profile)
        .values({
          userId,
          rollNumber: `22${String(101 + i).padStart(4, "0")}`,
          department: DEPARTMENTS[i % DEPARTMENTS.length],
        })
        .onConflictDoUpdate({
          target: profile.userId,
          set: { rollNumber: `22${String(101 + i).padStart(4, "0")}` },
        })
    }
    const admin = ids.get("harshal.more@vit.edu.in")!

    const audit: (typeof auditLog.$inferInsert)[] = []
    const communityIds = new Map<string, string>()
    for (const [i, c] of communities.entries()) {
      const createdAt = new Date(Date.now() - (60 - i) * 86_400_000)
      const [row] = await db
        .insert(community)
        .values({
          slug: c.slug,
          name: c.name,
          description: c.description,
          createdBy: admin,
          createdAt,
        })
        .returning({ id: community.id })
      communityIds.set(c.id, row.id)
      communityIds.set(c.slug, row.id)
      audit.push({
        actorId: admin,
        action: "community.created",
        targetType: "community",
        targetId: row.id,
        communityId: row.id,
        details: { name: c.name },
        createdAt,
      })
    }

    const team = [...LEADS]
    let pick = 0
    for (const fill of TEAM_FILL) {
      for (let n = 0; n < fill.count; n++) {
        const s = studentIdentity(pick++)
        team.push({ email: s.email, slug: fill.slug, role: fill.role })
      }
    }
    const emailToId = new Map([...ids.entries()])
    for (let i = 0; i < STUDENT_COUNT; i++)
      emailToId.set(studentIdentity(i).email, students[i])
    for (const m of team) {
      const communityId = communityIds.get(m.slug)!
      const userId = emailToId.get(m.email)!
      const addedBy =
        m.role === "lead"
          ? admin
          : (emailToId.get(
              LEADS.find((l) => l.slug === m.slug && l.role === "lead")!.email
            ) ?? admin)
      await db
        .insert(communityMember)
        .values({ communityId, userId, role: m.role, addedBy })
      audit.push({
        actorId: addedBy,
        action: "member.added",
        targetType: "user",
        targetId: userId,
        communityId,
        details: { email: m.email, role: m.role },
      })
    }

    const authorByName = new Map(
      [...DEV_PERSONAS, ...AUTHORS].map((p) => [p.name, ids.get(p.email)!])
    )
    const now = new Date()
    const pool = students.slice(pick)
    let cursor = 0
    let registrations = 0

    for (const p of [...posts, ...demoPosts]) {
      const past = !!p.endsAt && p.endsAt < now
      const status =
        p.status === "published" && p.isEvent && past ? "completed" : p.status
      const authorId = authorByName.get(p.authorName) ?? null
      const communityId = communityIds.get(p.communityId)!
      const [row] = await db
        .insert(post)
        .values({
          slug: p.slug,
          communityId,
          authorId,
          title: p.title,
          body: p.body,
          visibility: p.visibility,
          isPinned: p.isPinned,
          status,
          isEvent: p.isEvent,
          startsAt: p.startsAt ?? null,
          endsAt: p.endsAt ?? null,
          location: p.location ?? null,
          locationVisibility: p.isEvent
            ? (p.locationVisibility ?? "public")
            : null,
          registrationOpensAt: p.registrationOpensAt ?? null,
          registrationClosesAt: p.registrationClosesAt ?? null,
          capacity: p.capacity ?? null,
          requiresApproval: p.requiresApproval,
          registrationQuestions: p.registrationQuestions ?? [],
          createdAt: p.createdAt,
        })
        .returning({ id: post.id })
      audit.push({
        actorId: authorId,
        action: "post.published",
        targetType: "post",
        targetId: row.id,
        communityId,
        details: { title: p.title },
        createdAt: p.createdAt,
      })

      if (!p.isEvent) continue
      const rows: (typeof registration.$inferInsert)[] = []
      const questions = p.registrationQuestions ?? []
      const count = Math.min(p.registrationCount, pool.length)
      for (let i = 0; i < count; i++) {
        const regStatus = registrationStatus({ ...p, status }, i, now)
        rows.push({
          postId: row.id,
          userId: pool[(cursor + i) % pool.length],
          status: regStatus,
          checkedInAt: regStatus === "attended" ? p.startsAt : null,
          answers: demoAnswers(questions, i),
          registeredAt: new Date(p.createdAt.getTime() + (i + 1) * 3_600_000),
        })
      }
      cursor += 11
      const priya = PRIYA_PLAN[p.slug]
      if (priya)
        rows.push({
          postId: row.id,
          userId: ids.get("priya.nair@vit.edu.in")!,
          status: priya,
          checkedInAt: priya === "attended" ? p.startsAt : null,
          answers: demoAnswers(questions, count),
        })
      if (rows.length) await db.insert(registration).values(rows)
      registrations += rows.length
      if (past) {
        audit.push({
          actorId: ids.get("sneha.iyer@vit.edu.in")!,
          action: "registration.checkin",
          targetType: "post",
          targetId: row.id,
          communityId,
          details: {
            count: rows.filter((r) => r.status === "attended").length,
            title: p.title,
          },
          createdAt: p.startsAt,
        })
      }
    }

    for (const d of demoDrafts) {
      await db.insert(post).values({
        slug: `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-draft`,
        communityId: communityIds.get(d.communityId)!,
        authorId: authorByName.get(d.authorName) ?? null,
        title: d.title,
        body: d.body,
        status: "draft",
      })
    }

    await db.insert(auditLog).values(audit)

    console.log(
      `Seeded ${communities.length} communities, ${team.length} team members, ${posts.length + demoPosts.length + demoDrafts.length} posts, ${registrations} registrations, ${everyone.length} people.`
    )
    console.log("Personas:")
    for (const p of DEV_PERSONAS)
      console.log(`  ${p.label.padEnd(18)} ${p.email}`)
    const invalid = await db.execute<{ invalid: boolean }>(sql`
    select exists (
      select 1 from registration r left join post p on p.id = r.post_id
      left join "user" u on u.id = r.user_id
      where p.id is null or not p.is_event or u.id is null
      union all
      select 1 from community_member m left join community c on c.id = m.community_id
      left join "user" u on u.id = m.user_id where c.id is null or u.id is null
    ) as invalid
  `)
    if (invalid.rows[0]?.invalid) throw new Error("Invalid fixture references")
  })
  await seedPool.end()
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : "Fixture loading failed")
  process.exit(1)
})
