"use client"

import { useRef, useState } from "react"
import { ActionForm } from "@/components/action-form"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { registerAction } from "@/app/(site)/posts/[slug]/actions"
import {
  countWords,
  wordLimitLabel,
  type RegistrationQuestion,
} from "@/lib/registration-form"

type ChoiceQuestion = Extract<RegistrationQuestion, { type: "choice" }>
type TextQuestion = Extract<RegistrationQuestion, { type: "text" }>

export function RegistrationForm({
  postId,
  questions,
  requiresApproval,
}: {
  postId: string
  questions: RegistrationQuestion[]
  requiresApproval: boolean
}) {
  return (
    <Card id="registration-form" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Registration form</CardTitle>
        <CardDescription>
          Your name, VIT email, roll number and department are shared with the
          community team automatically. Your answers go to the same team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={registerAction}>
          <input type="hidden" name="postId" value={postId} />
          <FieldGroup>
            {questions.map((question) =>
              question.type === "choice" ? (
                <ChoiceField key={question.id} question={question} />
              ) : (
                <TextField key={question.id} question={question} />
              )
            )}
            <div className="space-y-3 border-t pt-5">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Check your answers before you submit. To change them later,
                cancel and register again while registration is open.
              </p>
              <SubmitButton
                size="lg"
                className="w-full sm:w-auto"
                pendingLabel={
                  requiresApproval ? "Sending request…" : "Registering…"
                }
              >
                {requiresApproval ? "Request to join" : "Register"}
              </SubmitButton>
            </div>
          </FieldGroup>
        </ActionForm>
      </CardContent>
    </Card>
  )
}

function Requirement({ required }: { required: boolean }) {
  return required ? (
    <>
      <span className="text-destructive" aria-hidden>
        *
      </span>
      <span className="sr-only">Required</span>
    </>
  ) : (
    <span className="text-muted-foreground text-xs font-normal">Optional</span>
  )
}

function ChoiceField({ question }: { question: ChoiceQuestion }) {
  const options = useRef<HTMLDivElement>(null)
  const [picked, setPicked] = useState(false)
  const clear = () => {
    options.current
      ?.querySelectorAll<HTMLInputElement>("input[type=radio]")
      .forEach((input) => {
        input.checked = false
      })
    setPicked(false)
  }
  return (
    <FieldSet className="min-w-0 gap-2">
      <FieldLegend
        variant="label"
        className="flex flex-wrap items-baseline gap-2 wrap-anywhere"
      >
        {question.label}
        <Requirement required={question.required} />
      </FieldLegend>
      <div ref={options} className="grid gap-2">
        {question.options.map((option) => (
          <label
            key={option}
            className="hover:bg-accent has-checked:border-ring has-checked:bg-accent has-focus-visible:ring-ring/50 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors has-focus-visible:ring-3"
          >
            <input
              type="radio"
              name={`answer.${question.id}`}
              value={option}
              aria-label={option}
              required={question.required}
              onChange={() => setPicked(true)}
              className="accent-primary size-4 shrink-0 outline-none"
            />
            <span className="min-w-0 wrap-anywhere">{option}</span>
          </label>
        ))}
      </div>
      {!question.required && picked && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={clear}
        >
          Clear choice
        </Button>
      )}
    </FieldSet>
  )
}

function TextField({ question }: { question: TextQuestion }) {
  const [words, setWords] = useState(0)
  const id = `answer-${question.id}`
  const outside =
    words > 0 && (words > question.maxWords || words < question.minWords)
  return (
    <Field>
      <FieldLabel
        htmlFor={id}
        className="flex-wrap items-baseline wrap-anywhere"
      >
        {question.label}
        <Requirement required={question.required} />
      </FieldLabel>
      <Textarea
        id={id}
        name={`answer.${question.id}`}
        required={question.required}
        aria-invalid={outside || undefined}
        aria-describedby={`${id}-limit ${id}-count`}
        className="min-h-40"
        onChange={(event) => setWords(countWords(event.target.value))}
      />
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
        <span id={`${id}-limit`} className="text-muted-foreground">
          {wordLimitLabel(question)}
        </span>
        <span
          id={`${id}-count`}
          aria-live="polite"
          className={
            outside
              ? "text-destructive tabular-nums"
              : "text-muted-foreground tabular-nums"
          }
        >
          {words} of {question.maxWords} words
        </span>
      </div>
    </Field>
  )
}
