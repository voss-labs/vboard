import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { config } from "dotenv"
import { Pool } from "pg"
import { requireLocalDatabase } from "@/db/driver"
import { migrate } from "@/db/migrate"
import { migrationFiles } from "@/db/migration-files"
import { provision } from "@/db/provision"
import { verifyDatabase } from "@/db/verify"
import { runSecurityTests } from "./db-security-tests"
import { testRuntimeBoundaries } from "./db-runtime-tests"
import { testTransitionBoundaries } from "./db-transition-tests"
import { testFilteredProjections } from "./db-projection-tests"
import { testRegistrationQuestions } from "./db-question-tests"
import { testCommunityRequests } from "./db-request-tests"
import { testUpdateRecipients } from "./db-update-tests"
import { seedLegacyFixture, seedSecurityFixture } from "./db-test-fixtures"

async function main() {
  config({ path: ".env.local", quiet: true })
  const direct = process.env.DIRECT_URL
  if (!direct) throw new Error("DIRECT_URL is required")
  const parsed = requireLocalDatabase(direct)
  const admin = new Pool({ connectionString: direct, max: 1 })
  const suffix = randomBytes(6).toString("hex")
  const passwords = {
    appPassword: process.env.VBOARD_APP_PASSWORD,
  }
  if (!passwords.appPassword) throw new Error("VBOARD_APP_PASSWORD is required")
  try {
    for (const kind of ["fresh", "legacy"]) {
      const name = `vboard_test_${kind}_${suffix}`
      const target = new URL(parsed)
      target.pathname = `/${name}`
      requireLocalDatabase(target.toString(), true)
      await admin.query(`CREATE DATABASE ${name}`)
      const owner = new Pool({ connectionString: target.toString(), max: 3 })
      const appUrl = new URL(target)
      appUrl.username = "vboard_app"
      appUrl.password = passwords.appPassword
      const app = new Pool({ connectionString: appUrl.toString(), max: 5 })
      try {
        await provision(owner, {
          appPassword: passwords.appPassword,
          superAdminEmails: ["super@vit.edu.in"],
        })
        if (kind === "legacy") {
          await owner.query((await migrationFiles())[0].content)
          await seedLegacyFixture(owner)
        }
        await migrate(owner)
        await migrate(owner)
        await verifyDatabase(app)
        if (kind === "legacy") {
          const roles = (
            await owner.query(
              "SELECT user_id,role,is_active,joined_at FROM public.community_member ORDER BY user_id"
            )
          ).rows
          assert.deepEqual(
            roles.map((r) => [r.user_id, r.role, r.is_active]),
            [
              ["legacy1", "lead", true],
              ["legacy2", "organizer", true],
              ["legacy3", "organizer", false],
              ["legacy4", "organizer", false],
              ["legacy5", "organizer", false],
            ]
          )
          assert(
            roles.every(
              (r) => r.joined_at.toISOString() === "2020-01-01T00:00:00.000Z"
            )
          )
          assert.equal(
            (
              await owner.query(
                "SELECT count(*)::int n FROM vboard_private.legacy_authority WHERE source_table IN ('community_invite','event_host','permission_override')"
              )
            ).rows[0].n,
            3
          )
          assert.deepEqual(
            (
              await owner.query(
                "SELECT details FROM public.audit_log WHERE action='historical'"
              )
            ).rows[0].details,
            { original: true }
          )
          assert.equal(
            (
              await owner.query(
                "SELECT count(*)::int n FROM public.registration"
              )
            ).rows[0].n,
            1
          )
          assert.equal(
            (
              await owner.query(
                "SELECT body FROM public.post WHERE slug='legacy-event'"
              )
            ).rows[0].body,
            "Original body"
          )
        } else {
          await seedSecurityFixture(owner)
          await runSecurityTests({
            owner,
            app,
            appUrl: appUrl.toString(),
          })
          await testFilteredProjections(owner, app)
          await testRegistrationQuestions(owner, app)
          await testCommunityRequests(owner, app)
          await testUpdateRecipients(owner, app)
          await testTransitionBoundaries(owner, app)
          await testRuntimeBoundaries({
            ownerUrl: target.toString(),
            appUrl: appUrl.toString(),
          })
        }
        console.log(`${kind} migration and security checks passed`)
      } finally {
        await Promise.all([owner.end(), app.end()])
        await admin.query(`DROP DATABASE ${name}`)
      }
    }
  } finally {
    await admin.end()
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Database integration failed"
  )
  if (error && typeof error === "object")
    console.error({
      position: Reflect.get(error, "position"),
      internalPosition: Reflect.get(error, "internalPosition"),
      where: Reflect.get(error, "where"),
    })
  process.exitCode = 1
})
