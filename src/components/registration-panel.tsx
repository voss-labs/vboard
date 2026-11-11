"use client"

import Link from "next/link"
import { CheckCircle2, Clock3 } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { SubmitButton } from "@/components/submit-button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent } from "@/components/ui/card"
import {
  cancelRegistrationAction,
  registerAction,
} from "@/app/(site)/posts/[slug]/actions"
import { onboardingPath } from "@/lib/profile"
import {
  canRegisterNow,
  type RegistrationAvailability,
  type RegistrationStatus,
} from "@/lib/registration"

type Props = {
  postId: string
  slug: string
  signedIn: boolean
  profileComplete: boolean
  requiresApproval: boolean
  availability: RegistrationAvailability
  status: RegistrationStatus | null
  closesOn: string | null
  seatsLeft: number | null
  questionCount: number
}

const STATUS_COPY: Partial<Record<RegistrationStatus, string>> = {
  pending: "Your request is pending",
  approved: "You're registered",
  attended: "You're checked in",
  rejected: "Your request was declined",
  no_show: "Marked as not attended",
}
const AVAILABILITY_COPY: Record<RegistrationAvailability, string> = {
  not_event: "Registration unavailable",
  unavailable: "Registration is unavailable",
  not_open: "Registration hasn't opened yet",
  closed: "Registration has closed",
  full: "This event is full",
  open: "Registration is open",
}

export function RegistrationPanel(props: Props) {
  const active =
    props.status === "pending" ||
    props.status === "approved" ||
    props.status === "attended"
  const headline =
    props.status && props.status !== "cancelled"
      ? STATUS_COPY[props.status]
      : AVAILABILITY_COPY[props.availability]
  const canRegister = canRegisterNow(props.status, props.availability)

  return (
    <Card className={active ? "ring-brand/35" : undefined}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-muted-foreground text-xs font-medium">
            Registration
          </h2>
          <p
            className="flex items-start gap-2 text-base leading-snug font-semibold"
            role="status"
          >
            {props.status === "pending" && (
              <Clock3
                className="text-warning mt-0.5 size-4 shrink-0"
                aria-hidden
              />
            )}
            {(props.status === "approved" || props.status === "attended") && (
              <CheckCircle2
                className="text-success mt-0.5 size-4 shrink-0"
                aria-hidden
              />
            )}
            {headline}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {props.status === "pending"
              ? "The community team will review your request. Check its status in your workspace."
              : canRegister && props.signedIn && !props.profileComplete
                ? "Add your roll number and year once. After that, registering for any event takes one tap."
                : canRegister
                  ? props.questionCount > 0
                    ? "The community team asks a few questions with this registration."
                    : props.requiresApproval
                      ? "The community team reviews requests before confirming a spot."
                      : "Register with your VIT account to reserve a spot."
                  : props.status === "approved"
                    ? "Your spot is confirmed. You can find this event in your registrations."
                    : props.status === "attended"
                      ? "Your attendance has been recorded."
                      : props.status === "rejected"
                        ? "The community team did not approve your request."
                        : "Check your registrations for any existing request."}
          </p>
        </div>
        {(props.closesOn || props.seatsLeft !== null) && (
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {props.closesOn && <span>Closes {props.closesOn}</span>}
            {props.seatsLeft !== null && (
              <span>{props.seatsLeft} spots left</span>
            )}
          </div>
        )}
        {!props.signedIn ? (
          <Link
            href={`/login?next=/posts/${props.slug}`}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            {props.availability === "open"
              ? "Sign in to register"
              : "Sign in to view registration"}
          </Link>
        ) : props.status === "pending" || props.status === "approved" ? (
          <ActionForm action={cancelRegistrationAction}>
            <input type="hidden" name="postId" value={props.postId} />
            <ConfirmSubmit
              label="Cancel registration"
              title="Cancel your registration?"
              description="Your registration will be cancelled. Any reserved spot will become available to other students."
              confirmLabel="Cancel registration"
              variant="outline"
              size="lg"
            />
          </ActionForm>
        ) : canRegister && !props.profileComplete ? (
          <Link
            href={onboardingPath(`/posts/${props.slug}`)}
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Finish your profile to register
          </Link>
        ) : canRegister && props.questionCount > 0 ? (
          <a
            href="#registration-form"
            className={buttonVariants({ size: "lg", className: "w-full" })}
          >
            Answer {props.questionCount}{" "}
            {props.questionCount === 1 ? "question" : "questions"} to register
          </a>
        ) : canRegister ? (
          <ActionForm action={registerAction}>
            <input type="hidden" name="postId" value={props.postId} />
            <SubmitButton
              size="lg"
              className="w-full"
              pendingLabel={
                props.requiresApproval ? "Sending request…" : "Registering…"
              }
            >
              {props.requiresApproval ? "Request to join" : "Register"}
            </SubmitButton>
          </ActionForm>
        ) : null}
        {props.signedIn && active && (
          <Link
            href="/dashboard/registrations"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-8 items-center text-xs underline underline-offset-4"
          >
            View my registrations
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
