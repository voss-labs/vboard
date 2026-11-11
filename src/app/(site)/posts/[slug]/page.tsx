import { withDb } from "@/db"
import { getTrustedActor } from "@/lib/session"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, Lock, MapPin, Users } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { RegistrationForm } from "@/components/registration-form"
import { RegistrationPanel } from "@/components/registration-panel"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LinkedText } from "@/components/linked-text"
import { getPostDetailBySlug, type FeedPost } from "@/db/queries/posts"
import { getRegistration } from "@/db/queries/registrations"
import { formatEventRange, formatShortDate } from "@/lib/format"
import {
  canRegisterNow,
  canSeeLocation,
  registrationAvailability,
  seatsLeft,
} from "@/lib/registration"
import type {
  RegistrationAnswers,
  RegistrationQuestion,
} from "@/lib/registration-form"
import { isProfileComplete } from "@/lib/profile"
import { communityCan } from "@/lib/rbac"
import { getSessionUser, roleIn } from "@/lib/session"

type Props = { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await withDb(await getTrustedActor(), async (ctx) =>
    getPostDetailBySlug(ctx, (await params).slug)
  )
  return { title: post ? `${post.title} · vboard` : "vboard" }
}

export default async function PostPage({ params }: Props) {
  const post = await withDb(await getTrustedActor(), async (ctx) =>
    getPostDetailBySlug(ctx, (await params).slug)
  )
  if (!post) notFound()
  const user = await getSessionUser()
  const role = user ? roleIn(user, post.communityId) : null
  const canManage = !!user && communityCan(user.siteRole, role, "post:read")
  if (post.status !== "published" && !canManage) notFound()
  if (post.visibility === "vit_only" && !user)
    return <SignInWall slug={post.slug} title={post.title} />
  const registration = user
    ? await withDb(await getTrustedActor(), async (ctx) =>
        getRegistration(ctx, post.id, user.id)
      )
    : null
  const status = registration?.status ?? null
  const showLocation = canSeeLocation(post, { status, canManage })
  const availability = registrationAvailability(post, post.seatsTaken)
  const questions = post.registrationQuestions
  const profileComplete = !!user && isProfileComplete(user)
  const showForm =
    profileComplete &&
    questions.length > 0 &&
    canRegisterNow(status, availability)
  const answers =
    registration && registration.status !== "cancelled"
      ? registration.answers
      : null

  return (
    <article className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to discover
        </Link>
        {canManage && (
          <Link
            href={`/dashboard/c/${post.communitySlug}/posts/${post.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Manage {post.isEvent ? "event" : "post"}
          </Link>
        )}
      </div>
      <header className="space-y-4 border-b pb-7">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/communities/${post.communitySlug}`}
            className="mr-1 max-w-full font-medium break-words hover:underline"
          >
            {post.communityName}
          </Link>
          <Badge variant="secondary">
            {post.isEvent ? "Event" : "Announcement"}
          </Badge>
          {post.visibility === "vit_only" && (
            <Badge variant="outline">
              <Lock aria-hidden />
              VIT only
            </Badge>
          )}
          {post.status !== "published" && (
            <Badge variant="outline" className="capitalize">
              {post.status}
            </Badge>
          )}
        </div>
        <h1 className="max-w-4xl text-3xl leading-tight font-semibold tracking-tight text-balance break-words md:text-4xl">
          {post.title}
        </h1>
        {post.authorName && (
          <p className="text-muted-foreground text-sm break-words">
            Posted by {post.authorName}
          </p>
        )}
        {post.status !== "published" && (
          <p className="text-muted-foreground text-sm break-words">
            This post is {post.status} and does not appear in public discovery.
          </p>
        )}
      </header>
      <div
        className={
          post.isEvent
            ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
            : "max-w-3xl"
        }
      >
        <div className="order-2 min-w-0 space-y-8 lg:order-1">
          <section className="space-y-4" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-sm font-semibold">
              {post.isEvent ? "About this event" : "Announcement"}
            </h2>
            <p className="max-w-[72ch] text-base leading-7 break-words whitespace-pre-line">
              <LinkedText text={post.body} />
            </p>
          </section>
          {showForm && (
            <RegistrationForm
              postId={post.id}
              questions={questions}
              requiresApproval={post.requiresApproval}
            />
          )}
          {answers && <YourAnswers questions={questions} answers={answers} />}
        </div>
        {post.isEvent && (
          <aside
            className="order-1 min-w-0 space-y-4 lg:sticky lg:top-24 lg:order-2"
            aria-label="Event details and registration"
          >
            {post.startsAt && (
              <EventMeta post={post} showLocation={showLocation} />
            )}
            <RegistrationPanel
              postId={post.id}
              slug={post.slug}
              signedIn={!!user}
              profileComplete={profileComplete}
              requiresApproval={post.requiresApproval}
              availability={availability}
              status={status}
              questionCount={questions.length}
              closesOn={
                post.registrationClosesAt
                  ? formatShortDate(post.registrationClosesAt)
                  : null
              }
              seatsLeft={seatsLeft(post.capacity, post.seatsTaken)}
            />
          </aside>
        )}
      </div>
    </article>
  )
}

function EventMeta({
  post,
  showLocation,
}: {
  post: FeedPost
  showLocation: boolean
}) {
  if (!post.startsAt) return null
  const { date, time } = formatEventRange(
    post.startsAt,
    post.endsAt ?? undefined
  )
  return (
    <Card>
      <CardContent>
        <dl className="divide-y text-sm">
          <div className="flex gap-3 pb-4">
            <CalendarDays
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">Date and time</dt>
              <dd className="font-medium">
                {date}
                <span className="text-muted-foreground mt-1 block text-xs font-normal">
                  {time} IST
                </span>
              </dd>
            </div>
          </div>
          <div className="flex gap-3 py-4">
            <MapPin
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <dt className="text-muted-foreground text-xs">Location</dt>
              <dd className="break-words">
                {showLocation ? (
                  (post.location ?? "To be announced")
                ) : (
                  <span className="flex items-start gap-1.5">
                    <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    Shared after approval
                  </span>
                )}
              </dd>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Users
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">Capacity</dt>
              <dd>
                {typeof post.capacity === "number" ? (
                  <>
                    {post.seatsTaken} of {post.capacity} spots taken
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {Math.max(0, post.capacity - post.seatsTaken)} spots
                      remaining
                    </span>
                  </>
                ) : (
                  "No capacity limit"
                )}
              </dd>
            </div>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function YourAnswers({
  questions,
  answers,
}: {
  questions: RegistrationQuestion[]
  answers: RegistrationAnswers
}) {
  const answered = questions.filter((question) => answers[question.id])
  if (answered.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your answers</CardTitle>
        <CardDescription>
          Shared with the community team that runs this event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-5 text-sm">
          {answered.map((question) => (
            <div key={question.id} className="space-y-1">
              <dt className="text-muted-foreground text-xs break-words">
                {question.label}
              </dt>
              <dd className="leading-relaxed break-words whitespace-pre-line">
                {answers[question.id]}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function SignInWall({ slug, title }: { slug: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-balance break-words">
        {title}
      </h1>
      <EmptyState
        title="This post is for VIT students"
        body="Sign in with your VOSS account to read this post and see its event details."
        icon={<Lock />}
        action={
          <Link
            href={`/login?next=/posts/${slug}`}
            className={buttonVariants({ size: "lg" })}
          >
            Sign in with VOSS
          </Link>
        }
      />
    </div>
  )
}
