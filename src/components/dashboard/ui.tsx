import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { COMMUNITY_ROLE_LABEL, type CommunityRole } from "@/lib/rbac"

export { PageHeader } from "@/components/page-header"
export { EmptyState } from "@/components/empty-state"

export function SectionCards({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none">
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  badge,
  footer,
  hint,
}: {
  label: string
  value: number | string
  badge?: React.ReactNode
  footer?: string
  hint?: string
}) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-4">
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {badge}
      </div>
      <div className="mt-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {footer && (
        <p className="text-muted-foreground mt-1.5 text-xs">{footer}</p>
      )}
      {hint && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
    </div>
  )
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <Card
      className={cn(
        "min-w-0 shadow-none",
        flush && "gap-0 overflow-hidden pb-0",
        className
      )}
    >
      {(title || action) && (
        <CardHeader
          className={cn(
            "gap-2 has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]",
            flush && "border-b pb-4"
          )}
        >
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && (
            <CardAction className="col-span-full row-auto w-full justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:w-auto sm:justify-self-end [&>form]:w-full">
              {action}
            </CardAction>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(flush && "px-0 [&>[data-slot=empty]]:m-4")}>
        {children}
      </CardContent>
    </Card>
  )
}

export function FormFooter({
  children,
  description,
}: {
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      {description && (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

export function RoleBadge({ role }: { role: CommunityRole | "super_admin" }) {
  const label =
    role === "super_admin" ? "Super admin" : COMMUNITY_ROLE_LABEL[role]
  return (
    <Badge
      variant={
        role === "lead" || role === "super_admin" ? "default" : "secondary"
      }
    >
      {label}
    </Badge>
  )
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  published: "default",
  approved: "default",
  attended: "default",
  active: "default",
  pending: "outline",
  draft: "secondary",
  cancelled: "secondary",
  completed: "secondary",
  no_show: "secondary",
  archived: "secondary",
  rejected: "destructive",
  hidden: "destructive",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  )
}
