import Link from "next/link"
import { withDb } from "@/db"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { RecordTable } from "@/components/dashboard/record-table"
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listAllCommunities } from "@/db/queries/communities"
import { listPendingCommunityRequests } from "@/db/queries/community-requests"
import { formatShortDate, formatStamp } from "@/lib/format"
import { formatPhone } from "@/lib/phone"
import { requireSiteCapability } from "@/lib/session"
import { setCommunityActiveAction } from "@/app/dashboard/admin/actions"
import { NewCommunity } from "@/app/dashboard/admin/communities/new-community"
import { RequestReview } from "@/app/dashboard/admin/communities/request-review"

export default async function AdminCommunitiesPage() {
  const user = await requireSiteCapability("community:create")
  const { communities, requests } = await withDb(
    { userId: user.id },
    async (ctx) => ({
      communities: await listAllCommunities(ctx),
      requests: await listPendingCommunityRequests(ctx),
    })
  )
  const active = communities.filter((c) => c.isActive).length

  return (
    <>
      <PageHeader
        title="Communities"
        description="Review requests, create communities and archive the ones that have wound down. Archiving hides a community and its posts without deleting anything."
        actions={<NewCommunity />}
      />
      {requests.length > 0 && (
        <Panel
          title="Requests to review"
          action={<Badge variant="secondary">{requests.length} waiting</Badge>}
          flush
        >
          <ul className="divide-y">
            {requests.map((request) => (
              <li
                key={request.id}
                className="grid gap-4 px-4 py-5 md:px-6 @4xl/main:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium break-words">{request.name}</p>
                    <p className="text-muted-foreground text-xs break-all">
                      /{request.slug} · {request.requesterName} ·{" "}
                      {request.requesterEmail} ·{" "}
                      {formatStamp(request.createdAt)}
                    </p>
                  </div>
                  {request.slugTaken && (
                    <p className="text-destructive text-sm">
                      This address is already in use. Reject it with a note
                      asking for a different one.
                    </p>
                  )}
                  <dl className="grid gap-3 text-sm @2xl/main:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground text-xs">
                        What it will do
                      </dt>
                      <dd className="leading-relaxed break-words whitespace-pre-line">
                        {request.purpose}
                      </dd>
                    </div>
                    {request.description && (
                      <div className="space-y-1">
                        <dt className="text-muted-foreground text-xs">
                          About, shown publicly
                        </dt>
                        <dd className="leading-relaxed break-words whitespace-pre-line">
                          {request.description}
                        </dd>
                      </div>
                    )}
                    <div className="space-y-1">
                      <dt className="text-muted-foreground text-xs">Contact</dt>
                      <dd className="flex flex-wrap gap-x-4 gap-y-1">
                        <a
                          href={`tel:+91${request.contactPhone}`}
                          className="tabular-nums underline-offset-4 hover:underline"
                        >
                          {formatPhone(request.contactPhone)}
                        </a>
                        <a
                          href={`mailto:${request.contactEmail}`}
                          className="break-all underline-offset-4 hover:underline"
                        >
                          {request.contactEmail}
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
                <RequestReview
                  requestId={request.id}
                  name={request.name}
                  requesterName={request.requesterName}
                  blocked={request.slugTaken}
                />
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel
        title="All communities"
        description={`${active} active · ${communities.length - active} archived`}
        flush
      >
        {communities.length === 0 ? (
          <EmptyState
            className="m-4"
            title="No communities yet"
            body="Create a community and appoint a Lead to get started."
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Community</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Posts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {communities.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9 rounded-lg max-md:hidden">
                        <AvatarFallback className="rounded-lg text-sm font-medium">
                          {c.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/c/${c.slug}`}
                          className="font-medium break-words hover:underline"
                        >
                          {c.name}
                        </Link>
                        <div className="text-muted-foreground text-xs break-all">
                          /{c.slug}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-label="Team" className="tabular-nums">
                    {c.teamCount}
                  </TableCell>
                  <TableCell data-label="Posts" className="tabular-nums">
                    {c.postCount}
                  </TableCell>
                  <TableCell
                    data-label="Created"
                    className="text-muted-foreground md:whitespace-nowrap!"
                  >
                    {formatShortDate(c.createdAt)}
                  </TableCell>
                  <TableCell data-label="Status">
                    <StatusBadge status={c.isActive ? "active" : "archived"} />
                  </TableCell>
                  <TableCell className="pr-6 md:text-right">
                    <ActionForm
                      action={setCommunityActiveAction}
                      className="inline"
                    >
                      <input type="hidden" name="communityId" value={c.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={c.isActive ? "false" : "true"}
                      />
                      {c.isActive ? (
                        <ConfirmSubmit
                          label="Archive"
                          variant="ghost"
                          title={`Archive ${c.name}?`}
                          description="Its posts leave the public site and its team loses dashboard access. You can restore it later."
                          confirmLabel="Archive"
                        />
                      ) : (
                        <SubmitButton size="sm" variant="outline">
                          Restore
                        </SubmitButton>
                      )}
                    </ActionForm>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </RecordTable>
        )}
      </Panel>
    </>
  )
}
