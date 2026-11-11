"use client"

import { XIcon } from "lucide-react"
import type { Decide } from "@/components/dashboard/use-registration-decisions"
import { Button } from "@/components/ui/button"
import type { ButtonVariants } from "@/components/ui/button-variants"
import {
  canReceiveDecision,
  type RegistrationDecision,
} from "@/lib/registration"

const DECISIONS: {
  value: RegistrationDecision
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
  selected,
  canDecide,
  canCheckIn,
  onDecide,
  onClear,
}: {
  selected: { id: string; status: string }[]
  canDecide: boolean
  canCheckIn: boolean
  onDecide: Decide
  onClear: () => void
}) {
  const allowed = { decide: canDecide, checkIn: canCheckIn }
  const actions = DECISIONS.filter((d) => allowed[d.needs])
    .map((d) => ({
      ...d,
      ids: selected
        .filter((row) => canReceiveDecision(d.value, row.status))
        .map((row) => row.id),
    }))
    .filter((d) => d.ids.length > 0)

  return (
    <div className="bg-card/95 supports-backdrop-filter:bg-card/80 sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur md:px-6">
      <div className="mr-auto flex items-center gap-1">
        <span aria-live="polite" className="text-sm font-medium tabular-nums">
          {selected.length} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Clear selection"
          onClick={onClear}
        >
          <XIcon />
        </Button>
      </div>
      {actions.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Nothing to do for this selection.
        </p>
      )}
      {actions.map((d) => (
        <Button
          key={d.value}
          size="sm"
          variant={d.variant}
          onClick={() => {
            onDecide(d.ids, d.value)
            onClear()
          }}
        >
          {d.label}
          {d.ids.length < selected.length && (
            <span className="tabular-nums opacity-70">{d.ids.length}</span>
          )}
        </Button>
      ))}
    </div>
  )
}
