import Link from "next/link"
import { withDb } from "@/db"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { PageHeader, Panel, StatusBadge } from "@/components/dashboard/ui"
import { buttonVariants } from "@/components/ui/button-variants"
import { listOwnCommunityRequests } from "@/db/queries/community-requests"
import { formatStamp } from "@/lib/format"
import { formatPhone } from "@/lib/phone"
import { requireUser } from "@/lib/session"
import { withdrawCommunityRequestAction } from "@/app/dashboard/start-community/actions"
import { CommunityRequestForm } from "@/app/dashboard/start-community/request-form"

const STEPS = [
  "Send the name, address, what the community will do and how to reach you.",
  "A Super admin reviews the request.",
  "Once approved, you become its Lead and can add your team and post events.",
]

export default async function StartCommunityPage() {
  const user = await requireUser()
  const requests = await withDb({ userId: user.id }, async (ctx) =>
    listOwnCommunityRequests(ctx)
  )
  const pending = requests.find((request) => request.status === "pending")

  return (
    <>
      <PageHeader
        title="Start a community"
        description="Bring your club or society to vboard. Each request is reviewed before the community goes live."
      />
      <div className="grid items-start gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {pending ? (
            <Panel
              title="Your request is with the reviewer"
              description="You will see the decision here. Withdraw it if you want to change the details and send it again."
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{pending.name}</p>
                  <p className="text-muted-foreground text-xs break-all">
                    /{pending.slug} · sent {formatStamp(pending.createdAt)}
                  </p>
                  <p className="text-muted-foreground text-xs break-all">
                    Contact {formatPhone(pending.contactPhone)} ·{" "}
                    {pending.contactEmail}
                  </p>
                </div>
                <ActionForm action={withdrawCommunityRequestAction}>
                  <input type="hidden" name="requestId" value={pending.id} />
                  <ConfirmSubmit
                    label="Withdraw"
                    variant="outline"
                    title={`Withdraw the request for ${pending.name}?`}
                    description="The reviewer will no longer see it. You can send a new request afterwards."
                    confirmLabel="Withdraw"
                  />
                </ActionForm>
              </div>
            </Panel>
          ) : (
            <Panel title="Community details">
              <CommunityRequestForm
                key={requests.length}
                email={user.email}
                phone={user.phone ?? ""}
              />
            </Panel>
          )}
          {requests.some((request) => request.status !== "pending") && (
            <Panel title="Earlier requests">
              <ul className="divide-y">
                {requests
                  .filter((request) => request.status !== "pending")
                  .map((request) => (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium break-words">
                          {request.name}
                        </p>
                        <p className="text-muted-foreground text-xs break-all">
                          /{request.slug} · {formatStamp(request.createdAt)}
                        </p>
                        {request.decisionNote && (
                          <p className="text-sm leading-relaxed break-words">
                            {request.decisionNote}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={request.status} />
                        {request.status === "approved" && (
                          <Link
                            href={`/dashboard/c/${request.slug}`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel title="How it works">
          <ol className="grid gap-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed">
                <span className="bg-muted text-muted-foreground grid size-6 shrink-0 place-content-center rounded-full text-xs font-medium tabular-nums">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  )
}
