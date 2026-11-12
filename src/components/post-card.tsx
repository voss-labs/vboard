import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Lock,
  MapPin,
  Pin,
  Users,
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { bodyPreview, formatEventDate, formatShortDate } from "@/lib/format"
import { mediaUrl } from "@/lib/media"

export type PostCardPost = {
  id: string
  slug: string
  title: string
  body: string
  imageUrl: string | null
  communitySlug: string
  communityName: string
  isEvent: boolean
  isPinned: boolean
  startsAt: Date | null
  endsAt: Date | null
  location: string | null
  locationVisibility: "public" | "after_approval" | null
  capacity: number | null
  seatsTaken: number
  requiresApproval: boolean
}

export function PostCard({
  post,
  variant = "default",
}: {
  post: PostCardPost
  variant?: "default" | "compact"
}) {
  const compact = variant === "compact"
  const date = post.startsAt ? formatShortDate(post.startsAt).split(" ") : null
  const poster = mediaUrl(post.imageUrl)

  return (
    <article className="min-w-0">
      <Card className="hover:ring-foreground/25 h-full gap-0 transition-shadow">
        <CardContent className={cn("flex gap-4", !compact && "md:gap-5")}>
          {post.isEvent && date && (
            <div
              className="bg-muted hidden h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg sm:flex"
              aria-hidden
            >
              <span className="text-brand text-xs font-medium">{date[1]}</span>
              <span className="text-2xl leading-tight font-semibold tracking-tight">
                {date[0]}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/communities/${post.communitySlug}`}
                className="text-muted-foreground hover:text-foreground max-w-full min-w-0 text-xs font-medium break-words hover:underline"
              >
                {post.communityName}
              </Link>
              <Badge variant="secondary">
                {post.isEvent ? "Event" : "Announcement"}
              </Badge>
              {post.isPinned && (
                <Badge variant="outline">
                  <Pin aria-hidden />
                  Pinned
                </Badge>
              )}
            </div>
            <h3
              className={cn(
                "mt-2 font-semibold tracking-tight text-pretty break-words",
                compact ? "text-base" : "text-lg md:text-xl"
              )}
            >
              <Link href={`/posts/${post.slug}`} className="hover:text-brand">
                {post.title}
              </Link>
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {bodyPreview(post.body, compact ? 120 : 200)}
            </p>
            {post.isEvent && (
              <ul className="text-muted-foreground mt-4 grid gap-2 text-xs leading-relaxed sm:text-sm">
                {post.startsAt && (
                  <li className="flex items-start gap-2">
                    <CalendarDays
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    <span>
                      {formatEventDate(post.startsAt, post.endsAt ?? undefined)}
                    </span>
                  </li>
                )}
                {post.locationVisibility === "after_approval" ? (
                  <li className="flex items-center gap-2">
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    Location shared after approval
                  </li>
                ) : (
                  post.location && (
                    <li className="flex items-start gap-2">
                      <MapPin
                        className="mt-0.5 size-3.5 shrink-0"
                        aria-hidden
                      />
                      <span className="break-words">{post.location}</span>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
          {poster && (
            <Link
              href={`/posts/${post.slug}`}
              tabIndex={-1}
              aria-hidden
              className={cn(
                "bg-muted relative shrink-0 self-start overflow-hidden rounded-lg border",
                compact ? "size-16" : "size-20 sm:size-28 md:size-32"
              )}
            >
              <Image
                src={poster}
                alt=""
                fill
                sizes="(min-width: 768px) 128px, 112px"
                className="object-cover"
              />
            </Link>
          )}
        </CardContent>
        <CardFooter className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {post.isEvent && typeof post.capacity === "number" && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden />
                {Math.max(0, post.capacity - post.seatsTaken)} spots left
              </span>
            )}
            {post.isEvent && post.requiresApproval && (
              <span>Approval required</span>
            )}
            {!post.isEvent && <span>From {post.communityName}</span>}
          </div>
          <Link
            href={`/posts/${post.slug}`}
            className="hover:text-brand inline-flex min-h-8 items-center gap-1.5 text-xs font-medium"
          >
            {post.isEvent ? "View event" : "Read announcement"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </CardFooter>
      </Card>
    </article>
  )
}
