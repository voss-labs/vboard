import { sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { createAuditLog } from "@/db/queries/audit"
import { projectionRows } from "@/db/queries/projections"
import type { UpdateAudience, UpdateRecipient } from "@/lib/update-email"

export async function listUpdateRecipients(ctx: DbContext) {
  return projectionRows<UpdateRecipient>(
    ctx,
    sql`select data from vboard_api.update_recipients() data`
  )
}

export async function recordUpdateSent(
  ctx: DbContext,
  update: {
    id: string
    subject: string
    audience: UpdateAudience
    recipients: number
    sent: number
  }
) {
  const { id, ...details } = update
  await createAuditLog(ctx, {
    action: "update.sent",
    targetType: "update",
    targetId: id,
    details,
  })
}
