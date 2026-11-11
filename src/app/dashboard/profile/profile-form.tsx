"use client"

import { ActionForm } from "@/components/action-form"
import { FormFooter } from "@/components/dashboard/ui"
import { ProfileFields } from "@/components/profile-fields"
import { SubmitButton } from "@/components/submit-button"
import type { StudyYear } from "@/lib/roll-number"
import { updateProfileAction } from "@/app/dashboard/profile/actions"

export function ProfileForm({
  initialRollNumber,
  initialYear,
  initialBio,
  academicDate,
}: {
  initialRollNumber: string | null
  initialYear: StudyYear | null
  initialBio: string | null
  academicDate: string
}) {
  return (
    <ActionForm action={updateProfileAction}>
      <ProfileFields
        initialRollNumber={initialRollNumber}
        initialYear={initialYear}
        initialBio={initialBio}
        academicDate={academicDate}
        required={false}
        footer={(valid) => (
          <FormFooter description="Shared with event organizers when you register.">
            <SubmitButton pendingLabel="Saving…" disabled={!valid}>
              Save profile
            </SubmitButton>
          </FormFooter>
        )}
      />
    </ActionForm>
  )
}
