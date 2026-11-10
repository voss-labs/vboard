"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { StatusBadge } from "@/components/dashboard/ui"
import type { RegistrationRow } from "@/components/dashboard/registrations-table"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { countWords, type RegistrationQuestion } from "@/lib/registration-form"
import { decideRegistrationsAction } from "@/app/dashboard/c/[slug]/posts/actions"

const CAN_APPROVE = ["pending", "rejected"]
const CAN_REJECT = ["pending", "approved"]

export function RegistrationDetail({
  row,
  questions,
  slug,
  postId,
  canDecide,
  position,
  total,
  onClose,
  onPrevious,
  onNext,
}: {
  row: RegistrationRow | null
  questions: RegistrationQuestion[]
  slug: string
  postId: string
  canDecide: boolean
  position: number | null
  total: number
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}) {
  const [shown, setShown] = useState(row)
  if (row && row !== shown) setShown(row)
  const canApprove = !!shown && canDecide && CAN_APPROVE.includes(shown.status)
  const canReject = !!shown && canDecide && CAN_REJECT.includes(shown.status)

  return (
    <Sheet
      open={!!row}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {shown && (
          <>
            <SheetHeader className="gap-3 border-b pr-12">
              <div className="space-y-1">
                <SheetTitle className="break-words">{shown.name}</SheetTitle>
                <SheetDescription className="break-all">
                  {shown.email}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={shown.status} />
                {shown.rollNumber && (
                  <Badge variant="outline" className="tabular-nums">
                    {shown.rollNumber}
                  </Badge>
                )}
                {shown.department && (
                  <Badge variant="outline">{shown.department}</Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  Registered {shown.registeredAt}
                </span>
              </div>
            </SheetHeader>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={!onPrevious}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                Previous
              </Button>
              <span
                aria-live="polite"
                className="text-muted-foreground text-xs tabular-nums"
              >
                {position === null
                  ? "Outside the current filter"
                  : `${position} of ${total}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={!onNext}
              >
                Next
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
              {questions.map((q) => {
                const answer = shown.answers[q.id] ?? ""
                return (
                  <section key={q.id} className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h3 className="text-muted-foreground text-xs font-medium break-words">
                        {q.label}
                      </h3>
                      {q.type === "text" && answer && (
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {countWords(answer)} words
                        </span>
                      )}
                    </div>
                    {answer ? (
                      <p className="max-w-[72ch] text-sm leading-relaxed break-words whitespace-pre-line">
                        {answer}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">No answer</p>
                    )}
                  </section>
                )
              })}
            </div>
            {(canApprove || canReject) && (
              <div className="border-t p-4">
                <ActionForm
                  key={shown.id}
                  action={decideRegistrationsAction}
                  className="flex flex-wrap gap-2 [&>[role=alert]]:mt-0 [&>[role=alert]]:w-full"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="registrationId" value={shown.id} />
                  {canApprove && (
                    <SubmitButton
                      name="decision"
                      value="approve"
                      className="flex-1 sm:flex-none"
                      pendingLabel="Applying…"
                    >
                      Approve
                    </SubmitButton>
                  )}
                  {canReject && (
                    <SubmitButton
                      name="decision"
                      value="reject"
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                      pendingLabel="Applying…"
                    >
                      Reject
                    </SubmitButton>
                  )}
                </ActionForm>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
