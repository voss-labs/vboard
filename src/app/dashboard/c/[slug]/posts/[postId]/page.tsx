import { LinkedText } from "@/components/linked-text"
import { z } from "zod"
import { withDb } from "@/db"
import { WorkspaceRouteTitle } from "@/components/dashboard/route-context"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeftIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PencilIcon,
} from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { RegistrationsTable } from "@/components/dashboard/registrations-table"
import {
  EmptyState,
  Panel,
  SectionCards,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import type { ButtonVariants } from "@/components/ui/button-variants"
import { getPostById } from "@/db/queries/posts"
import { listRegistrations } from "@/db/queries/registrations"
import { formatEventRange, formatStamp } from "@/lib/format"
import { requireCommunityAccess } from "@/lib/session"
import {
  deletePostAction,
  setPostStatusAction,
  togglePinAction,
} from "@/app/dashboard/c/[slug]/posts/actions"

export default async function ManagePostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; postId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { slug, postId } = await params
  const { status: initialFilter } = await searchParams
  const access = await requireCommunityAccess(slug)
  const id = z.uuid().safeParse(postId)
  const post = id.success
    ? await withDb({ userId: access.user.id }, async (ctx) =>
        getPostById(ctx, id.data)
      )
    : null
  if (!post || post.communityId !== access.community.id) notFound()

  const registrations =
    post.isEvent && access.can("registration:read")
      ? await withDb({ userId: access.user.id }, async (ctx) =>
          listRegistrations(ctx, post.id)
        )
      : []
  const count = (s: string) =>
    registrations.filter((r) => r.status === s).length
  const seats = count("approved") + count("attended")
  const range = post.startsAt
    ? formatEventRange(post.startsAt, post.endsAt ?? undefined)
    : null

  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={post.id} />
    </>
  )
  const statusButton = (
    status: string,
    label: string,
    variant: ButtonVariants["variant"] = "outline"
  ) => (
    <ActionForm action={setPostStatusAction}>
      {hidden}
      <input type="hidden" name="status" value={status} />
      <SubmitButton size="sm" variant={variant}>
        {label}
      </SubmitButton>
    </ActionForm>
  )

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WorkspaceRouteTitle id={post.id} title={post.title} />
      <div className="flex flex-col gap-4 @5xl/main:flex-row @5xl/main:items-start @5xl/main:justify-between">
        <div className="space-y-2">
          <Link
            href={`/dashboard/c/${slug}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "-ml-2",
            })}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            All posts
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight break-words">
            {post.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={post.status} />
            <Badge variant="outline">
              {post.isEvent ? "Event" : "Announcement"}
            </Badge>
            {post.visibility === "vit_only" && (
              <Badge variant="outline">VIT only</Badge>
            )}
            {post.isPinned && <Badge variant="secondary">Pinned</Badge>}
            {range && (
              <span className="text-muted-foreground text-sm">
                {range.date} · {range.time}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {post.status === "published" && (
            <Link
              href={`/posts/${post.slug}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              View live
            </Link>
          )}
          {access.can("post:write") && (
            <Link
              href={`/dashboard/c/${slug}/posts/${post.id}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          )}
          {access.can("post:publish") && (
            <>
              {post.status === "draft" &&
                statusButton("published", "Publish", "default")}
              {post.status === "published" &&
                statusButton("draft", "Unpublish")}
              {post.status === "published" &&
                post.isEvent &&
                statusButton("completed", "Mark completed")}
              {["cancelled", "completed"].includes(post.status) &&
                statusButton("published", "Reopen")}
              <ActionForm action={togglePinAction}>
                {hidden}
                <SubmitButton size="sm" variant="outline">
                  {post.isPinned ? "Unpin" : "Pin"}
                </SubmitButton>
              </ActionForm>
              {post.status === "published" && post.isEvent && (
                <ActionForm action={setPostStatusAction}>
                  {hidden}
                  <input type="hidden" name="status" value="cancelled" />
                  <ConfirmSubmit
                    label="Cancel event"
                    title="Cancel this event?"
                    description="Registration closes and the event leaves public discovery. Existing registrations remain on record."
                    confirmLabel="Cancel event"
                  />
                </ActionForm>
              )}
            </>
          )}
          {access.can("post:delete") && (
            <ActionForm action={deletePostAction}>
              {hidden}
              <ConfirmSubmit
                label="Delete"
                title="Delete this post?"
                description="This post leaves discovery. Existing registrations remain in history."
                confirmLabel="Delete post"
              />
            </ActionForm>
          )}
        </div>
      </div>

      {post.isEvent ? (
        access.can("registration:read") ? (
          <>
            <SectionCards>
              <StatCard
                label="Confirmed"
                value={seats}
                footer={
                  post.capacity ? `of ${post.capacity} seats` : "No seat limit"
                }
              />
              <StatCard
                label="Pending"
                value={count("pending")}
                badge={
                  count("pending") > 0 ? (
                    <Badge variant="outline">Needs review</Badge>
                  ) : undefined
                }
                footer={
                  post.requiresApproval ? "Approval required" : "Auto-approved"
                }
              />
              <StatCard
                label="Checked in"
                value={count("attended")}
                footer={`${count("no_show")} no-show`}
              />
              <StatCard
                label="Dropped"
                value={count("cancelled") + count("rejected")}
                footer="Cancelled or rejected"
              />
            </SectionCards>
            <Panel
              title="Registrations"
              flush
              action={
                access.can("registration:export") ? (
                  <a
                    href={`/dashboard/c/${slug}/posts/${post.id}/export`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Export CSV
                  </a>
                ) : undefined
              }
            >
              <RegistrationsTable
                slug={slug}
                postId={post.id}
                canDecide={access.can("registration:decide")}
                canCheckIn={access.can("registration:checkin")}
                initialFilter={initialFilter ?? "all"}
                questions={post.registrationQuestions}
                rows={registrations.map((r) => ({
                  id: r.id,
                  name: r.name,
                  email: r.email,
                  rollNumber: r.rollNumber,
                  department: r.department,
                  status: r.status,
                  registeredAt: formatStamp(r.registeredAt),
                  answers: r.answers,
                }))}
              />
            </Panel>
          </>
        ) : (
          <Panel title="Registrations">
            <EmptyState
              title="Registration access is limited"
              body="Your current role can read this post but cannot view its registrations."
            />
          </Panel>
        )
      ) : (
        <Panel title="Post">
          <p className="text-sm leading-relaxed whitespace-pre-line">
            <LinkedText text={post.body} />
          </p>
        </Panel>
      )}
    </div>
  )
}
