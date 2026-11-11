"use client"

import { ActionForm } from "@/components/action-form"
import { ProfileFields } from "@/components/profile-fields"
import { SubmitButton } from "@/components/submit-button"
import type { StudyYear } from "@/lib/roll-number"
import { completeOnboardingAction } from "@/app/(site)/onboarding/actions"

export function OnboardingForm({
  next,
  initialRollNumber,
  initialYear,
  initialBio,
  academicDate,
}: {
  next: string
  initialRollNumber: string | null
  initialYear: StudyYear | null
  initialBio: string | null
  academicDate: string
}) {
  return (
    <ActionForm action={completeOnboardingAction}>
      <input type="hidden" name="next" value={next} />
      <ProfileFields
        initialRollNumber={initialRollNumber}
        initialYear={initialYear}
        initialBio={initialBio}
        academicDate={academicDate}
        required
        footer={(valid) => (
          <div className="space-y-3 border-t pt-5">
            <SubmitButton
              size="lg"
              className="w-full"
              pendingLabel="Saving…"
              disabled={!valid}
            >
              Save and continue
            </SubmitButton>
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              You can change these any time from your profile.
            </p>
          </div>
        )}
      />
    </ActionForm>
  )
}
