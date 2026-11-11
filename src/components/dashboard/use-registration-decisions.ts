"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import {
  canReceiveDecision,
  DECISION_RESULT,
  type RegistrationDecision,
} from "@/lib/registration"
import { decideRegistrationsAction } from "@/app/dashboard/c/[slug]/posts/actions"

const DONE: Record<RegistrationDecision, string> = {
  approve: "approved",
  reject: "rejected",
  checkin: "checked in",
  noshow: "marked no-show",
  reset: "set back to approved",
}

export type Decide = (ids: string[], decision: RegistrationDecision) => void

export function useRegistrationDecisions<
  Row extends { id: string; status: string },
>(rows: Row[], slug: string, postId: string) {
  const [, startTransition] = useTransition()
  const [shown, apply] = useOptimistic(
    rows,
    (current, change: { ids: Set<string>; status: string }) =>
      current.map((row) =>
        change.ids.has(row.id) ? { ...row, status: change.status } : row
      )
  )

  const decide: Decide = (ids, decision) => {
    const eligible = shown
      .filter(
        (row) =>
          ids.includes(row.id) && canReceiveDecision(decision, row.status)
      )
      .map((row) => row.id)
    if (!eligible.length) return
    startTransition(async () => {
      apply({ ids: new Set(eligible), status: DECISION_RESULT[decision] })
      const data = new FormData()
      data.set("slug", slug)
      data.set("postId", postId)
      data.set("decision", decision)
      for (const id of eligible) data.append("registrationId", id)
      const result = await decideRegistrationsAction(null, data)
      if (!result.ok) toast.error(result.error)
      else
        toast.success(
          `${eligible.length} ${eligible.length === 1 ? "registration" : "registrations"} ${DONE[decision]}.`
        )
    })
  }

  return { rows: shown, decide }
}
