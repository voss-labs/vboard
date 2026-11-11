import Link from "next/link"
import { CheckIcon } from "lucide-react"
import { PageHeader, Panel, RoleBadge } from "@/components/dashboard/ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { initials } from "@/lib/identity"
import { academicDate, academicDay, isProfileComplete } from "@/lib/profile"
import { SITE_ROLE_LABEL } from "@/lib/rbac"
import { studyYear } from "@/lib/roll-number"
import { requireUser } from "@/lib/session"
import { ProfileForm } from "@/app/dashboard/profile/profile-form"

export default async function ProfilePage() {
  const user = await requireUser()
  const today = academicDate()
  const complete = isProfileComplete(user)

  return (
    <>
      <PageHeader
        title="Profile"
        description="The team running an event you register for sees your name, VIT email, roll number, department, division, year and bio."
      />

      <div className="grid items-start gap-6 @5xl/main:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel
          title="Registration details"
          description={
            complete
              ? undefined
              : "Add your roll number and year to register for events."
          }
          action={
            complete ? (
              <Badge variant="outline">
                <CheckIcon data-icon="inline-start" />
                Ready to register
              </Badge>
            ) : (
              <Badge variant="secondary">Incomplete</Badge>
            )
          }
        >
          <ProfileForm
            key={[user.rollNumber, user.cohortYear, user.bio].join("|")}
            initialRollNumber={user.rollNumber}
            initialYear={
              user.cohortYear === null
                ? null
                : studyYear(user.cohortYear, academicDay(today))
            }
            initialBio={user.bio}
            academicDate={today}
          />
        </Panel>

        <Panel>
          <div className="flex flex-col gap-5">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-11">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="font-medium">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium break-words">{user.name}</p>
                <p className="text-muted-foreground text-sm break-all">
                  {user.email}
                </p>
              </div>
            </div>
            <dl className="grid gap-3 border-t pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Site role</dt>
                <dd className="font-medium">
                  {SITE_ROLE_LABEL[user.siteRole]}
                </dd>
              </div>
              {user.memberships.map((m) => (
                <div
                  key={m.communityId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <dt className="min-w-0">
                    <Link
                      href={`/dashboard/c/${m.slug}`}
                      className="font-medium break-words hover:underline"
                    >
                      {m.name}
                    </Link>
                  </dt>
                  <dd>
                    <RoleBadge role={m.role} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground border-t pt-4 text-xs leading-relaxed">
              Name and email come from your VOSS account.
            </p>
          </div>
        </Panel>
      </div>
    </>
  )
}
