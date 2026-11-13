import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import type { Pool } from "pg"
import { createPool, verifyPrincipal } from "@/db/pool"
import * as schema from "@/db/schema/auth"

let database: NodePgDatabase<typeof schema> | undefined
let pool: Pool | undefined
let verified: Promise<void> | undefined
let authorized = false

function getDatabase() {
  if (!database) {
    pool = createPool()
    database = drizzle(pool, { schema })
  }
  return database
}

export async function verifyAuthDatabase() {
  getDatabase()
  verified ??= verifyPrincipal(pool!).catch((error) => {
    verified = undefined
    throw error
  })
  await verified
  authorized = true
}

export const authDb = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property) {
    if (!authorized)
      throw new Error("Auth database verification must complete before use")
    const db = getDatabase()
    return Reflect.get(db, property, db)
  },
})

export async function closeAuthDatabase() {
  await pool?.end()
  pool = undefined
  database = undefined
  verified = undefined
  authorized = false
}
