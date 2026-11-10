"use client"

import { ActionForm } from "@/components/action-form"
import { SubmitButton } from "@/components/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { decideRegistrationsAction } from "@/app/dashboard/c/[slug]/posts/actions"

export function RegistrationBulkActions({
  slug,
  postId,
  selected,
  visibleIds,
  canDecide,
  canCheckIn,
  onSelectedChange,
}: {
  slug: string
  postId: string
  selected: Set<string>
  visibleIds: string[]
  canDecide: boolean
  canCheckIn: boolean
  onSelectedChange: (next: Set<string>) => void
}) {
  const none = selected.size === 0
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  return (
    <ActionForm
      action={decideRegistrationsAction}
      onDone={() => onSelectedChange(new Set())}
      className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6 [&>[role=alert]]:w-full"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="registrationId" value={id} />
      ))}
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
        <label className="flex min-h-11 items-center gap-2 pr-2 text-xs">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(on) =>
              onSelectedChange(on ? new Set(visibleIds) : new Set())
            }
            aria-label="Select all visible registrations"
          />
          Select visible
        </label>
        <span
          aria-live="polite"
          className="text-muted-foreground text-sm tabular-nums sm:mr-2"
        >
          {selected.size} selected
        </span>
      </div>
      {canDecide && (
        <>
          <SubmitButton
            name="decision"
            value="approve"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={none}
            pendingLabel="Applying…"
          >
            Approve
          </SubmitButton>
          <SubmitButton
            name="decision"
            value="reject"
            size="sm"
            className="flex-1 sm:flex-none"
            variant="destructive"
            disabled={none}
            pendingLabel="Applying…"
          >
            Reject
          </SubmitButton>
        </>
      )}
      {canCheckIn && (
        <>
          <SubmitButton
            name="decision"
            value="checkin"
            size="sm"
            className="flex-1 sm:flex-none"
            variant="secondary"
            disabled={none}
            pendingLabel="Applying…"
          >
            Check in
          </SubmitButton>
          <SubmitButton
            name="decision"
            value="noshow"
            size="sm"
            className="flex-1 sm:flex-none"
            variant="outline"
            disabled={none}
            pendingLabel="Applying…"
          >
            No-show
          </SubmitButton>
          <SubmitButton
            name="decision"
            value="reset"
            size="sm"
            className="flex-1 sm:flex-none"
            variant="ghost"
            disabled={none}
            pendingLabel="Applying…"
          >
            Undo check-in
          </SubmitButton>
        </>
      )}
    </ActionForm>
  )
}
