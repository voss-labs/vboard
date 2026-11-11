import { randomUUID } from "node:crypto"
import { withDb } from "@/db"
import { devAuthEnabled } from "@/lib/dev-auth-gate"
import { PageHeader } from "@/components/dashboard/ui"
import { listUpdateRecipients } from "@/db/queries/updates"
import { emailConfigured, emailSender } from "@/lib/resend"
import { requireSiteCapability } from "@/lib/session"
import { audienceCounts } from "@/lib/update-email"
import { UpdateForm } from "@/app/dashboard/admin/updates/update-form"

export const dynamic = "force-dynamic"

export default async function UpdatesPage() {
  const user = await requireSiteCapability("update:send")
  const recipients = await withDb({ userId: user.id }, listUpdateRecipients)
  const sendId = randomUUID()
  const baseUrl = process.env.BETTER_AUTH_URL ?? ""

  return (
    <>
      <PageHeader
        title="Updates"
        description="Email the people who have signed in to vboard. Each person gets their own copy, addressed by first name."
      />
      <UpdateForm
        key={sendId}
        sendId={sendId}
        counts={audienceCounts(recipients)}
        me={{ name: user.name, email: user.email }}
        baseUrl={baseUrl}
        sender={emailSender()}
        ready={emailConfigured() && baseUrl !== ""}
        seeded={devAuthEnabled()}
      />
    </>
  )
}
