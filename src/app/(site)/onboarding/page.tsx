import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { safeReturnPath } from "@/lib/auth-redirect"
import {
  academicDate,
  academicDay,
  isProfileComplete,
  onboardingPath,
} from "@/lib/profile"
import { studyYear } from "@/lib/roll-number"
import { getSessionUser } from "@/lib/session"
import { OnboardingForm } from "@/app/(site)/onboarding/onboarding-form"

export const metadata: Metadata = { title: "Finish your profile · vboard" }
export const dynamic = "force-dynamic"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = safeReturnPath((await searchParams).next)
  const user = await getSessionUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(onboardingPath(next))}`)
  if (isProfileComplete(user)) redirect(next)
  const today = academicDate()

  return (
    <div className="mx-auto max-w-xl space-y-6 py-3 md:py-8">
      <PageHeader
        eyebrow="One-time setup"
        title="Finish your profile to register"
        description="Add your VIT details once. After this, registering for any event takes one tap."
      />
      <Card>
        <CardContent>
          <OnboardingForm
            next={next}
            initialRollNumber={user.rollNumber}
            initialYear={
              user.cohortYear === null
                ? null
                : studyYear(user.cohortYear, academicDay(today))
            }
            initialBio={user.bio}
            academicDate={today}
          />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs leading-relaxed break-words">
        Signed in as {user.name} ({user.email}). The team running an event you
        register for sees your name, VIT email, roll number, department,
        division, year and bio.
      </p>
    </div>
  )
}
