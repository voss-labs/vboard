import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { RegistrationForm } from "@/components/registration-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { formatEventRange } from "@/lib/format"
import { initials } from "@/lib/identity"
import { formatPhone } from "@/lib/phone"
import { divisionOf, onboardingPath, studyYearLabel } from "@/lib/profile"
import { canRegisterNow } from "@/lib/registration"
import { loadPostView } from "@/app/(site)/posts/[slug]/post-view"

type Props = { params: Promise<{ slug: string }> }

export const metadata: Metadata = { title: "Register · vboard" }
export const dynamic = "force-dynamic"

export default async function RegisterPage({ params }: Props) {
  const view = await loadPostView((await params).slug)
  if (!view) notFound()
  const { post, user } = view
  const back = `/posts/${post.slug}`
  if (!user) redirect(`/login?next=${back}/register`)
  if (!view.profileComplete) redirect(onboardingPath(`${back}/register`))
  const questions = post.registrationQuestions
  if (questions.length === 0 || !canRegisterNow(view.status, view.availability))
    redirect(back)
  const when = post.startsAt
    ? formatEventRange(post.startsAt, post.endsAt ?? undefined)
    : null
  const facts = [
    ["Roll no.", user.rollNumber],
    ["Department", user.department],
    ["Division", divisionOf(user.rollNumber)],
    ["Year", studyYearLabel(user.cohortYear)],
    ["Contact", user.phone && formatPhone(user.phone)],
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href={back}
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the event
      </Link>
      <header className="space-y-1.5 pb-2">
        <p className="text-muted-foreground text-sm break-words">
          {post.requiresApproval ? "Request to join" : "Register"} ·{" "}
          {post.communityName}
        </p>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance break-words sm:text-3xl">
          {post.title}
        </h1>
        {when && (
          <p className="text-muted-foreground text-sm break-words">
            {when.date} · {when.time} IST
          </p>
        )}
      </header>
      <RegistrationForm
        postId={post.id}
        slug={post.slug}
        questions={questions}
        requiresApproval={post.requiresApproval}
      >
        <Card className="gap-0 py-0">
          <div className="flex items-center gap-3 p-4">
            <Avatar className="size-10">
              {user.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback className="text-sm font-medium">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">Registering as</p>
              <p className="font-medium break-words">{user.name}</p>
              <p className="text-muted-foreground text-sm break-all">
                {user.email}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t p-4 sm:flex sm:flex-wrap sm:gap-x-8 lg:grid">
            {facts.map(
              ([label, value]) =>
                value && (
                  <div key={label} className="min-w-0 space-y-0.5">
                    <dt className="text-muted-foreground text-xs">{label}</dt>
                    <dd className="text-sm font-medium break-words tabular-nums">
                      {value}
                    </dd>
                  </div>
                )
            )}
          </dl>
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3 text-xs leading-relaxed">
            <p className="min-w-0 flex-1 basis-48">
              The community team sees these details with your answers, so the
              form does not ask for them again.
            </p>
            <Link
              href="/dashboard/profile"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit profile
            </Link>
          </div>
        </Card>
      </RegistrationForm>
    </div>
  )
}
