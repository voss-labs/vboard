import { withDb } from "@/db"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import {
  AppSidebar,
  type SidebarSection,
} from "@/components/dashboard/app-sidebar"
import { WorkspaceRouteProvider } from "@/components/dashboard/route-context"
import { SiteHeader } from "@/components/dashboard/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { listAllCommunities } from "@/db/queries/communities"
import { COMMUNITY_ROLE_LABEL, SITE_ROLE_LABEL, siteCan } from "@/lib/rbac"
import { homeRole } from "@/lib/home-role"
import { requireUser } from "@/lib/session"

export const metadata: Metadata = { title: "Dashboard · vboard" }
export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const isAdmin = siteCan(user.siteRole, "user:read")
  const presentationRole = homeRole(user)

  const sections: SidebarSection[] = [
    {
      items: [
        { title: "Overview", url: "/dashboard", icon: "overview" },
        {
          title: "My registrations",
          url: "/dashboard/registrations",
          icon: "registrations",
        },
        { title: "Profile", url: "/dashboard/profile", icon: "profile" },
      ],
    },
    {
      label: "Events",
      items: [
        { title: "All events", url: "/dashboard/events", icon: "events" },
      ],
    },
  ]
  if (user.memberships.length > 0) {
    sections.push({
      label: "Your communities",
      items: user.memberships.map((m) => ({
        title: m.name,
        url: `/dashboard/c/${m.slug}`,
        badge: COMMUNITY_ROLE_LABEL[m.role],
        initial: m.name.charAt(0),
      })),
    })
  }
  if (isAdmin) {
    sections.push({
      label: "Platform",
      items: [
        {
          title: "Communities",
          url: "/dashboard/admin/communities",
          icon: "communities",
        },
        { title: "People", url: "/dashboard/admin/people", icon: "people" },
        { title: "Audit log", url: "/dashboard/admin/audit", icon: "audit" },
      ],
    })
  }

  const names: Record<string, string> = {}
  const communities = isAdmin
    ? await withDb({ userId: user.id }, async (ctx) => listAllCommunities(ctx))
    : user.memberships
  for (const c of communities) names[c.slug] = c.name

  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <SidebarProvider
      defaultOpen={sidebarOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <WorkspaceRouteProvider>
        <AppSidebar
          variant="inset"
          sections={sections}
          user={{
            name: user.name,
            email: user.email,
            role:
              presentationRole === "lead" || presentationRole === "organizer"
                ? COMMUNITY_ROLE_LABEL[presentationRole]
                : SITE_ROLE_LABEL[presentationRole],
          }}
        />
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          className="min-w-0 dark:md:border"
        >
          <SiteHeader names={names} />
          <div className="@container/main flex min-w-0 flex-1 flex-col gap-6 p-4 text-sm md:p-6">
            {children}
          </div>
        </SidebarInset>
      </WorkspaceRouteProvider>
    </SidebarProvider>
  )
}
