import Link from "next/link"
import { CalendarDays, Lock, MapPin, Users } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card"
import type { FeedPost } from "@/db/queries/posts"
import { formatEventRange } from "@/lib/format"
import type {
  RegistrationAnswers,
  RegistrationQuestion,
} from "@/lib/registration-form"

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        aria-hidden
      />
      <div className="min-w-0 space-y-0.5">
        <dt className="text-muted-foreground text-xs">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  )
}

export function EventFacts({
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
    <dl className="grid gap-4 border-t p-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-6 sm:px-6 sm:py-5">
      <Fact icon={CalendarDays} label="Date and time">
        {date}
        <span className="text-muted-foreground block text-xs font-normal">
          {time} IST
        </span>
      </Fact>
      <Fact icon={MapPin} label="Location">
        {showLocation ? (
          (post.location ?? "To be announced")
        ) : (
          <span className="flex items-start gap-1.5">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Shared after approval
          </span>
        )}
      </Fact>
      <Fact icon={Users} label="Capacity">
        {typeof post.capacity === "number" ? (
          <>
            {post.seatsTaken} of {post.capacity} spots taken
            <span className="text-muted-foreground block text-xs font-normal">
              {Math.max(0, post.capacity - post.seatsTaken)} remaining
            </span>
          </>
        ) : (
          "No limit"
        )}
      </Fact>
    </dl>
  )
}

export function YourAnswers({
  questions,
  answers,
}: {
  questions: RegistrationQuestion[]
  answers: RegistrationAnswers
}) {
  const answered = questions.filter((question) => answers[question.id])
  if (answered.length === 0) return null
  return (
    <Card className="gap-0 py-0">
      <div className="space-y-1 p-4 sm:px-6 sm:pt-5">
        <h2 className="text-base font-medium">Your answers</h2>
        <p className="text-muted-foreground text-sm">
          Shared with the community team that runs this event.
        </p>
      </div>
      <dl className="divide-y border-t text-sm">
        {answered.map((question, index) => (
          <div key={question.id} className="space-y-1 px-4 py-3.5 sm:px-6">
            <dt className="text-muted-foreground text-xs break-words">
              {index + 1}. {question.label}
            </dt>
            <dd className="leading-relaxed break-words whitespace-pre-line">
              {answers[question.id]}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export function SignInWall({ next, title }: { next: string; title: string }) {
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
            href={`/login?next=${next}`}
            className={buttonVariants({ size: "lg" })}
          >
            Sign in with VOSS
          </Link>
        }
      />
    </div>
  )
}
