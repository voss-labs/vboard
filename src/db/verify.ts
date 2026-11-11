import { config } from "dotenv"
import { Pool } from "pg"
import { pathToFileURL } from "node:url"
import { verifyPrincipal } from "@/db/pool"

export async function verifyDatabase(app: Pool) {
  await verifyPrincipal(app)
  const result = await app.query<{ valid: boolean }>(`
    SELECT NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN ('profile','community','community_member','community_request','post','registration','audit_log')
      AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)) AND
      (SELECT count(*)=7 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname IN ('profile','community','community_member','community_request','post','registration','audit_log')) AND
      NOT EXISTS (SELECT 1 FROM unnest(ARRAY['user','session','account','verification']) t(name)
        CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p(privilege)
        WHERE NOT has_table_privilege(current_user,format('public.%I',t.name),p.privilege)) AND
      NOT has_table_privilege(current_user,'public.post','DELETE') AND
      NOT has_schema_privilege(current_user,'vboard_private','USAGE') AND
      NOT has_schema_privilege(current_user,'vboard_private','CREATE') AND
      NOT has_schema_privilege(current_user,'vboard_api','CREATE') AND
      NOT has_function_privilege(current_user,'vboard_api.post_projection(uuid)','EXECUTE') AS valid`)
  if (!result.rows[0]?.valid)
    throw new Error("Domain security configuration is invalid")
  const retired = await app.query<{ valid: boolean }>(
    `SELECT NOT r.rolcanlogin AND NOT EXISTS
      (SELECT 1 FROM unnest(ARRAY['user','session','account','verification']) t(name)
        WHERE has_table_privilege(r.rolname,format('public.%I',t.name),'SELECT,INSERT,UPDATE,DELETE')) AS valid
    FROM pg_roles r WHERE r.rolname='vboard_auth'`
  )
  if (!retired.rows[0]?.valid)
    throw new Error("Legacy auth principal is not retired")
}
async function main() {
  config({ path: ".env.local", quiet: true })
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
  const app = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 })
  try {
    await verifyDatabase(app)
    console.log("Runtime principals, RLS and grant boundaries verified")
  } finally {
    await app.end()
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Verification failed"
    )
    process.exitCode = 1
  })
