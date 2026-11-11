import { withDb } from "@/db"
import { RecordTable } from "@/components/dashboard/record-table"
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  countUsers,
  listPeople,
  listProfileContacts,
} from "@/db/queries/profiles"
import { formatDay } from "@/lib/format"
import { initials } from "@/lib/identity"
import { formatPhone } from "@/lib/phone"
import { divisionOf, studyYearLabel } from "@/lib/profile"
import { SITE_ROLE_LABEL } from "@/lib/rbac"
import { requireSiteCapability } from "@/lib/session"
import { PeopleSearch } from "@/app/dashboard/admin/people/people-search"

const PAGE = 100

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireSiteCapability("user:read")
  const { q = "" } = await searchParams
  const { people, contacts, total } = await withDb(
    { userId: user.id },
    async (ctx) => {
      const people = await listPeople(ctx, q, PAGE)
      return {
        people,
        contacts: new Map(
          (
            await listProfileContacts(
              ctx,
              people.map((person) => person.id)
            )
          ).map((row) => [row.userId, row])
        ),
        total: await countUsers(ctx),
      }
    }
  )
  const capped = people.length === PAGE
  const summary = q
    ? `${people.length}${capped ? "+" : ""} of ${total} match`
    : capped && total > PAGE
      ? `First ${PAGE} of ${total} people`
      : `${total} ${total === 1 ? "person" : "people"}`

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone who has signed in. Community roles are managed from each community team."
      />
      <Panel flush className="pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 md:px-6">
          <PeopleSearch initial={q} />
          <p
            className="text-muted-foreground text-xs tabular-nums"
            aria-live="polite"
          >
            {summary}
            {capped && total > PAGE && !q && ". Search to find the rest."}
          </p>
        </div>
        {people.length === 0 ? (
          <EmptyState
            className="m-4"
            title={q ? "No people match" : "No people yet"}
            body={
              q
                ? "Try a different name, email or roll number."
                : "Accounts appear here after their first sign-in."
            }
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="pr-6">Site role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                const contact = contacts.get(p.id)
                const details = [
                  p.department,
                  divisionOf(p.rollNumber) && `Div ${divisionOf(p.rollNumber)}`,
                  studyYearLabel(contact?.cohortYear ?? null),
                ].filter(Boolean)
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8 max-md:hidden">
                          <AvatarFallback className="text-xs font-medium">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium break-words">
                            {p.name}
                          </div>
                          <div className="text-muted-foreground text-xs break-all">
                            {p.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-label="Roll no.">
                      {p.rollNumber ? (
                        <div>
                          <div className="tabular-nums">{p.rollNumber}</div>
                          {details.length > 0 && (
                            <div className="text-muted-foreground text-xs md:whitespace-nowrap">
                              {details.join(" · ")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not added</span>
                      )}
                    </TableCell>
                    <TableCell data-label="Contact" className="tabular-nums">
                      {contact?.phone ? (
                        <a
                          href={`tel:+91${contact.phone}`}
                          className="underline-offset-4 hover:underline md:whitespace-nowrap"
                        >
                          {formatPhone(contact.phone)}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not added</span>
                      )}
                    </TableCell>
                    <TableCell
                      data-label="Joined"
                      className="text-muted-foreground md:whitespace-nowrap"
                    >
                      {formatDay(new Date(p.createdAt))}
                    </TableCell>
                    <TableCell data-label="Site role" className="pr-6">
                      {p.siteRole === "super_admin" ? (
                        <Badge>{SITE_ROLE_LABEL[p.siteRole]}</Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {SITE_ROLE_LABEL[p.siteRole]}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </RecordTable>
        )}
      </Panel>
    </>
  )
}
