import type { Pool } from "pg"
import { sql } from "drizzle-orm"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import {
  createPool,
  retryConnect,
  verifyPrincipal,
  withClient,
} from "@/db/pool"
import * as schema from "@/db/schema"

export type DbActor = Readonly<{ userId: string }>
export type DbTransaction = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0]
export type DbContext = Readonly<{ tx: DbTransaction; actorId: string | null }>
let runtimePool: Pool | undefined
let verified: Promise<void> | undefined

function verifiedPool() {
  const pool = (runtimePool ??= createPool())
  verified ??= verifyPrincipal(pool).catch((error) => {
    verified = undefined
    throw error
  })
  return verified.then(() => pool)
}

export async function withDb<T>(
  actor: DbActor | null,
  work: (ctx: DbContext) => Promise<T>
): Promise<T> {
  const pool = await verifiedPool()
  return retryConnect((connected) =>
    withClient(pool, (client) =>
      drizzle(client, { schema }).transaction(async (tx) => {
        connected()
        await tx.execute(
          sql`select set_config('vboard.actor_id', ${actor?.userId ?? ""}, true)`
        )
        await tx.execute(sql`select vboard_api.actor_id()`)
        return work({ tx, actorId: actor?.userId ?? null })
      })
    )
  )
}

export async function closeDatabase() {
  await runtimePool?.end()
  runtimePool = undefined
  verified = undefined
}
