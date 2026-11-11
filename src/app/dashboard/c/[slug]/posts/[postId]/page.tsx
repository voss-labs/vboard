import { z } from "zod"
import { withDb } from "@/db"
import { WorkspaceRouteTitle } from "@/components/dashboard/route-context"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon, DownloadIcon } from "lucide-react"
import { PostActions } from "@/components/dashboard/post-actions"
import { RegistrationsTable } from "@/components/dashboard/registrations-table"
import {
  EmptyState,
  Panel,
  SectionCards,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { LinkedText } from "@/components/linked-text"
import { getPostById } from "@/db/queries/posts"
import { listRegistrations } from "@/db/queries/registrations"
import { formatEventRange, formatStamp } from "@/lib/format"
import { divisionOf, studyYearLabel } from "@/lib/profile"
import { requireCommunityAccess } from "@/lib/session"

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

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WorkspaceRouteTitle id={post.id} title={post.title} />
      <div className="flex flex-col gap-3">
        <Link
          href={`/dashboard/c/${slug}`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "text-muted-foreground -ml-2 self-start",
          })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          {access.community.name}
        </Link>
        <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-start @2xl/main:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-semibold tracking-tight break-words">
                {post.title}
              </h1>
              <StatusBadge status={post.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              {[
                post.isEvent ? "Event" : "Announcement",
                range && `${range.date} · ${range.time}`,
                post.visibility === "vit_only" && "VIT only",
                post.isPinned && "Pinned",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <PostActions
            slug={slug}
            postId={post.id}
            postSlug={post.slug}
            status={post.status}
            isEvent={post.isEvent}
            isPinned={post.isPinned}
            canWrite={access.can("post:write")}
            canPublish={access.can("post:publish")}
            canDelete={access.can("post:delete")}
          />
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
              className="overflow-clip"
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
                  division: divisionOf(r.rollNumber),
                  year: studyYearLabel(r.cohortYear),
                  phone: r.phone,
                  bio: r.bio,
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
