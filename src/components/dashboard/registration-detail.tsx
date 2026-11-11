"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { StatusBadge } from "@/components/dashboard/ui"
import type { RegistrationRow } from "@/components/dashboard/registrations-table"
import { LinkedText } from "@/components/linked-text"
import { SubmitButton } from "@/components/submit-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium break-words tabular-nums">{value}</dd>
    </div>
  )
}

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
  const answered = shown
    ? questions.filter((q) => shown.answers[q.id]).length
    : 0

  return (
    <Sheet
      open={!!row}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") onPrevious?.()
          if (event.key === "ArrowRight") onNext?.()
        }}
      >
        {shown && (
          <>
            <SheetHeader className="flex-row items-center gap-3 border-b pr-14">
              <Avatar className="size-10 max-sm:hidden">
                <AvatarFallback className="text-sm font-medium">
                  {initialsOf(shown.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <SheetTitle className="break-words">{shown.name}</SheetTitle>
                  <StatusBadge status={shown.status} />
                </div>
                <SheetDescription className="break-all">
                  {shown.email}
                </SheetDescription>
              </div>
            </SheetHeader>
            <div key={shown.id} className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 border-b p-4">
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                  <Fact label="Roll no." value={shown.rollNumber} />
                  <Fact label="Department" value={shown.department} />
                  <Fact label="Division" value={shown.division} />
                  <Fact label="Year" value={shown.year} />
                  <Fact label="Registered" value={shown.registeredAt} />
                </dl>
                {shown.bio && (
                  <div className="space-y-1">
                    <h3 className="text-muted-foreground text-xs">About</h3>
                    <p className="max-w-[72ch] text-sm leading-relaxed break-words whitespace-pre-line">
                      {shown.bio}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium">Answers</h3>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {answered} of {questions.length} answered
                  </span>
                </div>
                <ol className="space-y-5">
                  {questions.map((q, index) => {
                    const answer = shown.answers[q.id] ?? ""
                    return (
                      <li
                        key={q.id}
                        className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 gap-y-2"
                      >
                        <span className="text-muted-foreground text-xs leading-5 tabular-nums">
                          {index + 1}
                        </span>
                        <div className="flex items-baseline justify-between gap-3">
                          <h4 className="text-muted-foreground text-sm leading-5 break-words">
                            {q.label}
                          </h4>
                          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                            {!answer
                              ? "No answer"
                              : q.type === "text"
                                ? `${countWords(answer)} words`
                                : null}
                          </span>
                        </div>
                        {answer && (
                          <p
                            className={
                              q.type === "choice"
                                ? "bg-muted col-start-2 w-fit max-w-full rounded-lg px-3 py-1.5 text-sm font-medium break-words"
                                : "bg-muted/50 col-start-2 rounded-lg px-3 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line"
                            }
                          >
                            {q.type === "choice" ? (
                              answer
                            ) : (
                              <LinkedText text={answer} />
                            )}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="max-md:size-11"
                  onClick={onPrevious}
                  disabled={!onPrevious}
                  aria-label="Previous registration"
                  aria-keyshortcuts="ArrowLeft"
                >
                  <ChevronLeftIcon />
                </Button>
                <span
                  aria-live="polite"
                  className="text-muted-foreground min-w-16 text-center text-xs tabular-nums"
                >
                  {position === null
                    ? "Not in filter"
                    : `${position} of ${total}`}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="max-md:size-11"
                  onClick={onNext}
                  disabled={!onNext}
                  aria-label="Next registration"
                  aria-keyshortcuts="ArrowRight"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              {(canApprove || canReject) && (
                <ActionForm
                  key={shown.id}
                  action={decideRegistrationsAction}
                  className="flex flex-wrap justify-end gap-2 [&>[role=alert]]:mt-0 [&>[role=alert]]:w-full"
                >
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="postId" value={postId} />
                  <input type="hidden" name="registrationId" value={shown.id} />
                  {canReject && (
                    <SubmitButton
                      name="decision"
                      value="reject"
                      variant="destructive"
                      pendingLabel="Applying…"
                    >
                      Reject
                    </SubmitButton>
                  )}
                  {canApprove && (
                    <SubmitButton
                      name="decision"
                      value="approve"
                      pendingLabel="Applying…"
                    >
                      Approve
                    </SubmitButton>
                  )}
                </ActionForm>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
