import Link from "next/link"
import { ExternalLinkIcon, PlusIcon } from "lucide-react"
import { CommunitySection } from "@/components/dashboard/community-section"
import { RouteTabs } from "@/components/dashboard/route-tabs"
import { RoleBadge } from "@/components/dashboard/ui"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import { requireCommunityAccess } from "@/lib/session"

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const access = await requireCommunityAccess(slug)
  const base = `/dashboard/c/${slug}`
  const tabs = [
    { href: base, label: "Posts & events", match: [`${base}/posts`] },
  ]
  if (access.can("member:read"))
    tabs.push({ href: `${base}/team`, label: "Team", match: [] })
  if (access.can("community:update"))
    tabs.push({ href: `${base}/settings`, label: "Settings", match: [] })

  return (
    <div className="flex flex-col gap-6">
      <CommunitySection base={base}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-12 rounded-lg">
              <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-lg font-semibold">
                {access.community.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight break-words">
                {access.community.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={access.role ?? "super_admin"} />
                {!access.community.isActive && (
                  <Badge variant="destructive">Archived</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/communities/${slug}`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              Public page
            </Link>
            {access.can("post:write") && (
              <Link href={`${base}/posts/new`} className={buttonVariants()}>
                <PlusIcon data-icon="inline-start" />
                New post
              </Link>
            )}
          </div>
        </div>
        <RouteTabs items={tabs} />
      </CommunitySection>
      {children}
    </div>
  )
}
