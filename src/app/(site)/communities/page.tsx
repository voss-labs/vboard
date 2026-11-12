import { withDb } from "@/db"
import { getTrustedActor } from "@/lib/session"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, PlusIcon, Users } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { CommunityLogo } from "@/components/community-logo"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button-variants"
import { listActiveCommunities } from "@/db/queries/communities"

export const metadata: Metadata = { title: "Communities · vboard" }
export const dynamic = "force-dynamic"

const START = "/dashboard/start-community"

function count(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`
}

export default async function CommunitiesPage() {
  const actor = await getTrustedActor()
  const communities = await withDb(actor, async (ctx) =>
    listActiveCommunities(ctx)
  )
  const start = actor?.userId
    ? START
    : `/login?next=${encodeURIComponent(START)}`

  return (
    <div className="space-y-8">
      <PageHeader
        title="Find your people"
        description="Explore the clubs and societies at VIT, and see what they're putting together next."
        className="[&_h1]:text-3xl md:[&_h1]:text-4xl"
        actions={
          <Link href={start} className={buttonVariants({ variant: "outline" })}>
            <PlusIcon data-icon="inline-start" />
            Start a community
          </Link>
        }
      />
      <section aria-label="Communities" className="space-y-4">
        <div className="text-muted-foreground border-b pb-3 text-xs">
          {count(communities.length, "community", "communities")} on vboard
        </div>
        {communities.length === 0 ? (
          <EmptyState
            title="Communities are on their way"
            body="Clubs and societies will appear here when they join vboard."
            icon={<Users />}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.slug}`}
                className="group bg-card hover:border-foreground/25 focus-visible:ring-ring/50 flex gap-4 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-3"
              >
                <CommunityLogo
                  name={community.name}
                  logoUrl={community.logoUrl}
                  className="size-12 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="group-hover:text-brand leading-snug font-semibold tracking-tight break-words">
                      {community.name}
                    </h2>
                    <ArrowRight
                      className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                  {community.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed break-words">
                      {community.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-auto pt-1.5 text-xs">
                    {community.eventCount === 0
                      ? "No events yet"
                      : count(community.eventCount, "event", "events")}
                    {" · "}
                    {community.teamCount} on the team
                  </p>
                </div>
              </Link>
            ))}
            <Link
              href={start}
              className="group hover:border-foreground/25 focus-visible:ring-ring/50 flex items-center gap-4 rounded-xl border border-dashed p-4 transition-colors outline-none focus-visible:ring-3"
            >
              <span className="bg-muted text-muted-foreground grid size-12 shrink-0 place-content-center rounded-xl">
                <PlusIcon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block leading-snug font-semibold tracking-tight">
                  Start a community
                </span>
                <span className="text-muted-foreground block text-sm leading-relaxed">
                  Run a club or society that is not here yet? Ask to add it.
                </span>
              </span>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
