import { Pool, type PoolClient } from "pg"

const CONNECT_RETRY_DELAY_MS = 500

function reason(error: unknown): string {
  const source =
    error instanceof Error && error.cause instanceof Error ? error.cause : error
  if (!(source instanceof Error)) return "unknown error"
  return (
    source.message || ("code" in source ? String(source.code) : source.name)
  )
}

export async function retryConnect<T>(
  attempt: (connected: () => void) => Promise<T>
): Promise<T> {
  let reached = false
  const run = () =>
    attempt(() => {
      reached = true
    })
  try {
    return await run()
  } catch (error) {
    if (reached) throw error
    console.warn("Database connection failed, retrying once:", reason(error))
    await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS))
    return run()
  }
}

export function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")
  const pool = new Pool({
    connectionString,
    max: 5,
    allowExitOnIdle: true,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  })
  pool.on("error", (error) =>
    console.warn("Idle database connection closed:", error.message)
  )
  return pool
}

function leaveFailureToTheQuery() {}

export async function withClient<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  client.on("error", leaveFailureToTheQuery)
  try {
    return await work(client)
  } finally {
    client.removeListener("error", leaveFailureToTheQuery)
    client.release()
  }
}

export async function verifyPrincipal(pool: Pool) {
  const role = await retryConnect((connected) =>
    withClient(pool, async (client) => {
      connected()
      const { rows } = await client.query<{ valid: boolean }>(
        `
        SELECT current_user = $1 AND NOT r.rolsuper AND NOT r.rolbypassrls
          AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication
          AND NOT EXISTS (SELECT 1 FROM pg_roles other WHERE other.rolname <> current_user
            AND pg_has_role(current_user, other.oid, 'MEMBER'))
          AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relowner = r.oid AND c.relnamespace = 'public'::regnamespace)
          AND NOT has_schema_privilege(current_user, 'public', 'CREATE') AS valid
        FROM pg_roles r WHERE r.rolname = current_user`,
        ["vboard_app"]
      )
      return rows[0]
    })
  )
  if (!role?.valid)
    throw new Error("Database principal must be the restricted vboard_app role")
}
