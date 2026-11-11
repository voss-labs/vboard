import { z } from "zod"
import { withDb } from "@/db"
import { NextResponse } from "next/server"
import { getPostById } from "@/db/queries/posts"
import { listRegistrations } from "@/db/queries/registrations"
import { answerLabels } from "@/lib/registration-form"
import { toCsv } from "@/lib/csv"
import { slugify } from "@/lib/slug"
import { getCommunityAccess, getSessionUser } from "@/lib/session"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const { slug, postId } = await params
  const user = await getSessionUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  const access = await getCommunityAccess(user, slug)
  if (!access?.can("registration:export"))
    return new NextResponse("Not found", { status: 404 })
  const id = z.uuid().safeParse(postId)
  const post = id.success
    ? await withDb({ userId: access.user.id }, (ctx) =>
        getPostById(ctx, id.data)
      )
    : null
  if (!post || post.communityId !== access.community.id)
    return new NextResponse("Not found", { status: 404 })

  const rows = await withDb({ userId: access.user.id }, (ctx) =>
    listRegistrations(ctx, post.id)
  )
  const csv = toCsv(
    [
      "Name",
      "Email",
      "Roll number",
      "Department",
      "Status",
      "Registered at",
      "Checked in at",
      ...post.registrationQuestions.map((q) => q.label),
    ],
    rows.map((r) => {
      const answers = answerLabels(post.registrationQuestions, r.answers)
      return [
        r.name,
        r.email,
        r.rollNumber,
        r.department,
        r.status,
        r.registeredAt,
        r.checkedInAt,
        ...post.registrationQuestions.map((q) => answers[q.id] ?? ""),
      ]
    })
  )
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(post.title) || "event"}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
