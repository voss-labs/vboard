import { z } from "zod"
import { withDb } from "@/db"
import { WorkspaceRouteTitle } from "@/components/dashboard/route-context"
import { notFound } from "next/navigation"
import { PostForm } from "@/components/dashboard/post-form"
import { getPostById } from "@/db/queries/posts"
import { listRegistrations } from "@/db/queries/registrations"
import { pickedChoices } from "@/lib/registration-form"
import { toCampusInputValue } from "@/lib/format"
import { requireCommunityAccess } from "@/lib/session"
import { updatePostAction } from "@/app/dashboard/c/[slug]/posts/actions"

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>
}) {
  const { slug, postId } = await params
  const access = await requireCommunityAccess(slug, "post:write")
  const id = z.uuid().safeParse(postId)
  const post = id.success
    ? await withDb({ userId: access.user.id }, async (ctx) =>
        getPostById(ctx, id.data)
      )
    : null
  if (!post || post.communityId !== access.community.id) notFound()
  const answers = post.isEvent
    ? await withDb({ userId: access.user.id }, async (ctx) =>
        (await listRegistrations(ctx, post.id)).map((row) => row.answers)
      )
    : []

  return (
    <>
      <WorkspaceRouteTitle id={post.id} title={post.title} />
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Edit post</h2>
        <p className="text-muted-foreground text-sm">{post.title}</p>
      </div>
      <PostForm
        action={updatePostAction}
        slug={slug}
        postId={post.id}
        canPublish={access.can("post:publish")}
        mode="edit"
        questionsLocked={answers.length > 0}
        pickedChoices={pickedChoices(post.registrationQuestions, answers)}
        defaults={{
          title: post.title,
          body: post.body,
          visibility: post.visibility,
          isPinned: post.isPinned,
          isEvent: post.isEvent,
          startsAt: toCampusInputValue(post.startsAt),
          endsAt: toCampusInputValue(post.endsAt),
          location: post.location ?? "",
          locationVisibility: post.locationVisibility ?? "public",
          registrationOpensAt: toCampusInputValue(post.registrationOpensAt),
          registrationClosesAt: toCampusInputValue(post.registrationClosesAt),
          capacity: post.capacity?.toString() ?? "",
          requiresApproval: post.requiresApproval,
          registrationQuestions: post.registrationQuestions,
        }}
      />
    </>
  )
}
