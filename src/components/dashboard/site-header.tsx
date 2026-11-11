"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import { useWorkspaceRoute } from "@/components/dashboard/route-context"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const LABELS: Record<string, string> = {
  dashboard: "Workspace",
  registrations: "My registrations",
  events: "All events",
  profile: "Profile",
  communities: "Communities",
  "start-community": "Start a community",
  people: "People",
  audit: "Audit log",
  new: "New post",
  edit: "Edit post",
  team: "Team",
  settings: "Settings",
}

export function SiteHeader({ names }: { names: Record<string, string> }) {
  const pathname = usePathname()
  const route = useWorkspaceRoute()
  const parts = pathname.split("/").filter(Boolean)
  const crumbs = parts.flatMap((part, i) => {
    if (["c", "posts", "admin"].includes(part)) return []
    const label =
      names[part] ??
      LABELS[part] ??
      (parts[i - 1] === "posts"
        ? route?.id === part
          ? route.title
          : "Event details"
        : null)
    return label ? [{ href: `/${parts.slice(0, i + 1).join("/")}`, label }] : []
  })
  return (
    <header className="bg-background/95 flex h-(--header-height) shrink-0 items-center border-b md:rounded-t-xl">
      <div className="flex w-full min-w-0 items-center gap-2 px-4 md:px-6">
        <SidebarTrigger className="-ml-1 min-h-11 min-w-11" />
        <Separator
          orientation="vertical"
          className="mr-1 h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap gap-1.5">
            {crumbs.map((crumb, i) => (
              <Fragment key={crumb.href}>
                {i > 0 && (
                  <BreadcrumbSeparator
                    className={
                      i < crumbs.length - 1
                        ? "hidden md:block"
                        : "hidden sm:block"
                    }
                  />
                )}
                <BreadcrumbItem
                  className={
                    i < crumbs.length - 1 ? "hidden min-w-0 md:flex" : "min-w-0"
                  }
                >
                  {i === crumbs.length - 1 ? (
                    <BreadcrumbPage className="truncate">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      className="max-w-52 truncate"
                      render={<Link href={crumb.href} />}
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <ThemeToggle variant="dashboard" className="shrink-0" />
      </div>
    </header>
  )
}
