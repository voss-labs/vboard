import assert from "node:assert/strict"
import { Pool } from "pg"
import { requireLocalDatabase } from "@/db/driver"
import { provision } from "@/db/provision"
import { migrate } from "@/db/migrate"
import { verifyDatabase } from "@/db/verify"

async function main() {
  const supplied = process.env.PROVISION_TEST_URL
  if (!supplied) throw new Error("PROVISION_TEST_URL is required")
  const target = requireLocalDatabase(supplied, true)
  const root = new Pool({ connectionString: target.toString(), max: 1 })
  const database = "vboard_test_provision"
  const ownerRole = "vboard_test_owner"
  const ownerPassword = "local-test-owner-password"
  const passwords = {
    appPassword: "local-test-app-password",
    superAdminEmails: ["super@vit.edu.in"],
  }
  const urlFor = (role: string, password: string) => {
    const url = new URL(target)
    url.pathname = `/${database}`
    url.username = role
    url.password = password
    return url.toString()
  }
  let owner: Pool | undefined
  let app: Pool | undefined
  let created = false
  try {
    const occupied =
      await root.query(`SELECT rolname FROM pg_roles WHERE rolname IN
      ('vboard_app','vboard_auth','vboard_guard','vboard_test_owner','vboard_test_extra')`)
    assert.equal(
      occupied.rows.length,
      0,
      "Use an isolated disposable PostgreSQL cluster without existing vboard roles"
    )
    await root.query(
      `CREATE ROLE ${ownerRole} LOGIN CREATEROLE CREATEDB NOSUPERUSER NOBYPASSRLS NOREPLICATION PASSWORD '${ownerPassword}'`
    )
    await root.query(`CREATE DATABASE ${database} OWNER ${ownerRole}`)
    created = true
    owner = new Pool({
      connectionString: urlFor(ownerRole, ownerPassword),
      max: 1,
    })
    app = new Pool({
      connectionString: urlFor("vboard_app", passwords.appPassword),
      max: 1,
    })
    const admin = (
      await owner.query(
        "SELECT rolsuper,rolbypassrls,rolcreaterole FROM pg_roles WHERE rolname=current_user"
      )
    ).rows[0]
    assert.deepEqual(admin, {
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: true,
    })
    await provision(owner, passwords)
    await provision(owner, passwords)
    await owner.query("CREATE ROLE vboard_test_extra NOLOGIN")
    await owner.query("GRANT vboard_test_extra TO vboard_app")
    await owner.query("ALTER ROLE vboard_auth CREATEDB CREATEROLE")
    await owner.query("ALTER ROLE vboard_guard LOGIN")
    await provision(owner, passwords)
    const safe = (
      await owner.query(`SELECT bool_and(NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolreplication
      AND NOT r.rolcreatedb AND NOT r.rolcreaterole AND r.rolcanlogin=(r.rolname='vboard_app')
      AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid)) AS valid
      FROM pg_roles r WHERE r.rolname IN ('vboard_app','vboard_auth','vboard_guard')`)
    ).rows[0]
    assert.equal(safe.valid, true)
    await root.query("ALTER ROLE vboard_auth BYPASSRLS")
    await assert.rejects(provision(owner, passwords), /unsafe role attributes/)
    await root.query("ALTER ROLE vboard_auth NOBYPASSRLS")
    await provision(owner, passwords)
    await migrate(owner)
    await migrate(owner)
    await verifyDatabase(app)
    const guard = (
      await owner.query(`SELECT
      NOT has_schema_privilege('vboard_guard','vboard_api','CREATE')
      AND NOT has_schema_privilege('vboard_guard','public','CREATE')
      AND NOT has_schema_privilege('vboard_guard','vboard_private','CREATE')
      AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='vboard_api' AND p.proowner<>'vboard_guard'::regrole) AS valid`)
    ).rows[0]
    assert.equal(guard.valid, true)
    assert.equal(
      (await owner.query("SELECT count(*)::int n FROM public._migrations"))
        .rows[0].n,
      12
    )
    assert.equal(
      (
        await app.query(
          "SELECT count(*)::int n FROM vboard_api.community_summaries()"
        )
      ).rows[0].n,
      0
    )
    console.log(
      "Managed-admin provisioning, safe-role repair, elevated-role rejection, repeated migrations and runtime boundaries passed"
    )
  } finally {
    await Promise.all([owner?.end(), app?.end()])
    if (created) {
      await root.query(`DROP DATABASE ${database}`)
      await root.query(`DROP OWNED BY ${ownerRole}`)
      for (const role of [
        "vboard_app",
        "vboard_auth",
        "vboard_guard",
        "vboard_test_extra",
        ownerRole,
      ])
        await root.query(`DROP ROLE IF EXISTS ${role}`)
    }
    await root.end()
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Provisioning regression failed"
  )
  process.exitCode = 1
})
