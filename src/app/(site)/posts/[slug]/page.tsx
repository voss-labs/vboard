import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import { LinkedText } from "@/components/linked-text"
import { RegistrationPanel } from "@/components/registration-panel"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import { withDb } from "@/db"
import { getPostDetailBySlug } from "@/db/queries/posts"
import { formatShortDate } from "@/lib/format"
import { mediaUrl } from "@/lib/media"
import { canSeeLocation, seatsLeft } from "@/lib/registration"
import { answerLabels } from "@/lib/registration-form"
import { getTrustedActor } from "@/lib/session"
import {
  EventFacts,
  SignInWall,
  YourAnswers,
} from "@/app/(site)/posts/[slug]/post-sections"
import { loadPostView } from "@/app/(site)/posts/[slug]/post-view"

type Props = { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await withDb(await getTrustedActor(), async (ctx) =>
    getPostDetailBySlug(ctx, (await params).slug)
  )
  return { title: post ? `${post.title} · vboard` : "vboard" }
}

export default async function PostPage({ params }: Props) {
  const view = await loadPostView((await params).slug)
  if (!view) notFound()
  const { post, user, canManage, registration, status } = view
  if (post.visibility === "vit_only" && !user)
    return <SignInWall next={`/posts/${post.slug}`} title={post.title} />
  const questions = post.registrationQuestions
  const poster = mediaUrl(post.imageUrl)
  const answers =
    registration && registration.status !== "cancelled"
      ? answerLabels(questions, registration.answers)
      : null

  return (
    <article className="mx-auto max-w-6xl space-y-4">
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
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage {post.isEvent ? "event" : "post"}
          </Link>
        )}
      </div>
      <div
        className={
          post.isEvent
            ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:gap-x-6"
            : "mx-auto max-w-3xl space-y-4"
        }
      >
        <Card className="min-w-0 gap-0 overflow-hidden py-0 lg:col-start-1 lg:row-start-1">
          {poster && (
            <a
              href={poster}
              target="_blank"
              rel="noreferrer"
              className="bg-muted block border-b"
              aria-label="Open the poster at full size"
            >
              <Image
                src={poster}
                alt={`Poster for ${post.title}`}
                width={1280}
                height={720}
                sizes="(min-width: 1024px) 760px, 100vw"
                priority
                className="mx-auto h-auto max-h-[28rem] w-auto max-w-full object-contain"
              />
            </a>
          )}
          <header className="space-y-3 p-4 sm:p-6">
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
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance break-words sm:text-3xl">
              {post.title}
            </h1>
            {post.authorName && (
              <p className="text-muted-foreground text-sm break-words">
                Posted by {post.authorName}
              </p>
            )}
            {post.status !== "published" && (
              <p className="text-muted-foreground text-sm break-words">
                This post is {post.status} and does not appear in public
                discovery.
              </p>
            )}
          </header>
          {post.isEvent && (
            <EventFacts
              post={post}
              showLocation={canSeeLocation(post, { status, canManage })}
            />
          )}
        </Card>
        {post.isEvent && (
          <aside
            className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1"
            aria-label="Registration"
          >
            <RegistrationPanel
              postId={post.id}
              slug={post.slug}
              signedIn={!!user}
              profileComplete={view.profileComplete}
              requiresApproval={post.requiresApproval}
              availability={view.availability}
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
        <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
          <Card className="gap-0 py-0">
            <section
              className="space-y-3 p-4 sm:p-6"
              aria-labelledby="about-heading"
            >
              <h2 id="about-heading" className="text-base font-medium">
                {post.isEvent ? "About this event" : "Announcement"}
              </h2>
              <p className="max-w-[72ch] text-base leading-7 break-words whitespace-pre-line">
                <LinkedText text={post.body} />
              </p>
            </section>
          </Card>
          {answers && <YourAnswers questions={questions} answers={answers} />}
        </div>
      </div>
    </article>
  )
}
