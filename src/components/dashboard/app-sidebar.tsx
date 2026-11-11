"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarCheckIcon,
  CalendarIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  PlusIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import { NavUser } from "@/components/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

const ICONS = {
  overview: LayoutDashboardIcon,
  registrations: CalendarCheckIcon,
  events: CalendarIcon,
  profile: UserIcon,
  communities: ShieldIcon,
  start: PlusIcon,
  people: UsersIcon,
  audit: HistoryIcon,
}

export type SidebarItem = {
  title: string
  url: string
  icon?: keyof typeof ICONS
  badge?: string
  initial?: string
}

export type SidebarSection = { label?: string; items: SidebarItem[] }

export function AppSidebar({
  sections,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sections: SidebarSection[]
  user: { name: string; email: string; role: string }
}) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const activeUrl = sections
    .flatMap((section) => section.items)
    .filter(
      (item) =>
        pathname === item.url ||
        (item.url !== "/dashboard" && pathname.startsWith(`${item.url}/`))
    )
    .sort((a, b) => b.url.length - a.url.length)[0]?.url

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
              tooltip="vboard"
              onClick={() => {
                if (isMobile) setOpenMobile(false)
              }}
            >
              <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md text-xs font-black">
                v
              </span>
              <span className="flex items-end gap-1 text-base font-extrabold tracking-[-0.045em] group-data-[collapsible=icon]:hidden">
                vboard
                <span
                  className="bg-brand mb-[3px] size-1.5 rounded-full"
                  aria-hidden
                />
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, i) => (
          <SidebarGroup key={section.label ?? i}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon ? ICONS[item.icon] : null
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={activeUrl === item.url}
                        render={<Link href={item.url} />}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false)
                        }}
                      >
                        {Icon ? (
                          <Icon />
                        ) : (
                          <span className="bg-muted text-muted-foreground grid size-4 place-items-center rounded-sm text-[0.6rem] font-semibold">
                            {item.initial}
                          </span>
                        )}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.badge && (
                        <SidebarMenuBadge className="text-muted-foreground text-[0.65rem] font-normal">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
