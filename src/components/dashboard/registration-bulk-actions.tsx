"use client"

import { XIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import type { ButtonVariants } from "@/components/ui/button-variants"
import { decideRegistrationsAction } from "@/app/dashboard/c/[slug]/posts/actions"

const DECISIONS: {
  value: string
  label: string
  variant: ButtonVariants["variant"]
  needs: "decide" | "checkIn"
}[] = [
  { value: "approve", label: "Approve", variant: "default", needs: "decide" },
  { value: "reject", label: "Reject", variant: "destructive", needs: "decide" },
  {
    value: "checkin",
    label: "Check in",
    variant: "secondary",
    needs: "checkIn",
  },
  { value: "noshow", label: "No-show", variant: "outline", needs: "checkIn" },
  {
    value: "reset",
    label: "Undo check-in",
    variant: "ghost",
    needs: "checkIn",
  },
]

export function RegistrationBulkActions({
  slug,
  postId,
  selected,
  canDecide,
  canCheckIn,
  onSelectedChange,
}: {
  slug: string
  postId: string
  selected: Set<string>
  canDecide: boolean
  canCheckIn: boolean
  onSelectedChange: (next: Set<string>) => void
}) {
  const allowed = { decide: canDecide, checkIn: canCheckIn }

  return (
    <ActionForm
      action={decideRegistrationsAction}
      onDone={() => onSelectedChange(new Set())}
      className="bg-card/95 supports-backdrop-filter:bg-card/80 sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur md:px-6 [&>[role=alert]]:mt-0 [&>[role=alert]]:w-full"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="postId" value={postId} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="registrationId" value={id} />
      ))}
      <div className="mr-auto flex items-center gap-1">
        <span aria-live="polite" className="text-sm font-medium tabular-nums">
          {selected.size} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Clear selection"
          onClick={() => onSelectedChange(new Set())}
        >
          <XIcon />
        </Button>
      </div>
      {DECISIONS.filter((d) => allowed[d.needs]).map((d) => (
        <SubmitButton
          key={d.value}
          name="decision"
          value={d.value}
          size="sm"
          variant={d.variant}
          pendingLabel="Applying…"
        >
          {d.label}
        </SubmitButton>
      ))}
    </ActionForm>
  )
}
