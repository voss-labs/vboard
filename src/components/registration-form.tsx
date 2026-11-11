"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { registerAction } from "@/app/(site)/posts/[slug]/actions"
import {
  answerSize,
  countWords,
  wordLimitLabel,
  type RegistrationQuestion,
} from "@/lib/registration-form"
import { cn } from "@/lib/utils"

type ChoiceQuestion = Extract<RegistrationQuestion, { type: "choice" }>
type TextQuestion = Extract<RegistrationQuestion, { type: "text" }>
type Mark = (questionId: string, answered: boolean) => void

const COMPACT_OPTION_LENGTH = 28
const TINY_OPTION_LENGTH = 14

export function RegistrationForm({
  postId,
  slug,
  questions,
  requiresApproval,
  children,
}: {
  postId: string
  slug: string
  questions: RegistrationQuestion[]
  requiresApproval: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState<Record<string, boolean>>({})
  const mark = useCallback<Mark>(
    (id, done) =>
      setAnswered((prev) =>
        Boolean(prev[id]) === done ? prev : { ...prev, [id]: done }
      ),
    []
  )
  const count = questions.filter((question) => answered[question.id]).length
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await registerAction(null, data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      if (result.message) toast.success(result.message)
      router.push(`/posts/${slug}`)
    })
  }

  return (
    <form
      onSubmit={submit}
      className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-x-6"
    >
      <input type="hidden" name="postId" value={postId} />
      <Card className="order-2 min-w-0 gap-0 py-0 lg:order-1">
        <ol className="divide-y">
          {questions.map((question, index) => (
            <li key={question.id} className="p-4 sm:px-6 sm:py-5">
              {question.type === "choice" ? (
                <ChoiceField
                  number={index + 1}
                  question={question}
                  onAnswered={mark}
                />
              ) : (
                <TextField
                  number={index + 1}
                  question={question}
                  onAnswered={mark}
                />
              )}
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed sm:px-6">
          Check your answers before you submit. To change them later, cancel and
          register again while registration is open.
        </p>
      </Card>
      <div className="contents lg:sticky lg:top-24 lg:order-2 lg:block lg:space-y-4">
        <div className="order-1 min-w-0">{children}</div>
        <div className="bg-card ring-border sticky bottom-3 z-10 order-3 flex flex-col gap-3 rounded-xl p-3 shadow-lg ring-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 lg:static lg:flex-col lg:items-stretch lg:p-4 lg:shadow-none">
          {error && (
            <p
              role="alert"
              className="text-destructive basis-full text-sm leading-relaxed break-words"
            >
              {error}
            </p>
          )}
          <div className="min-w-0 space-y-1.5 sm:w-56 lg:w-auto">
            <p
              className="text-muted-foreground text-xs tabular-nums"
              aria-live="polite"
            >
              {count} of {questions.length} answered
            </p>
            <progress
              value={count}
              max={questions.length}
              aria-label="Questions answered"
              className="[&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-brand [&::-moz-progress-bar]:bg-brand bg-muted block h-1 w-full appearance-none overflow-hidden rounded-full [&::-webkit-progress-value]:transition-all"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto lg:w-full"
            disabled={pending}
            aria-busy={pending}
          >
            {pending && (
              <Loader2Icon data-icon="inline-start" className="animate-spin" />
            )}
            {pending
              ? requiresApproval
                ? "Sending request…"
                : "Registering…"
              : requiresApproval
                ? "Request to join"
                : "Register"}
          </Button>
        </div>
      </div>
    </form>
  )
}

function Prompt({
  number,
  question,
}: {
  number: number
  question: RegistrationQuestion
}) {
  return (
    <>
      <span className="min-w-0 break-words">
        <span className="text-muted-foreground tabular-nums">{number}. </span>
        {question.label}
        {question.required && (
          <>
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
            <span className="sr-only"> Required</span>
          </>
        )}
      </span>
      {!question.required && (
        <span className="text-muted-foreground text-xs font-normal">
          Optional
        </span>
      )}
    </>
  )
}

function ChoiceField({
  number,
  question,
  onAnswered,
}: {
  number: number
  question: ChoiceQuestion
  onAnswered: Mark
}) {
  const [value, setValue] = useState<string | null>(null)
  const pick = (next: string | null) => {
    setValue(next)
    onAnswered(question.id, next !== null)
  }
  const longest = Math.max(...question.options.map((option) => option.length))

  return (
    <FieldSet className="gap-3">
      <FieldLegend
        variant="label"
        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-snug"
      >
        <Prompt number={number} question={question} />
      </FieldLegend>
      <div
        className={cn(
          "grid gap-2",
          longest <= TINY_OPTION_LENGTH
            ? "grid-cols-2"
            : longest <= COMPACT_OPTION_LENGTH && "sm:grid-cols-2"
        )}
      >
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
              checked={value === option}
              onChange={() => pick(option)}
              className="accent-primary size-4 shrink-0 outline-none"
            />
            <span className="min-w-0 break-words">{option}</span>
          </label>
        ))}
      </div>
      {!question.required && value !== null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => pick(null)}
        >
          Clear choice
        </Button>
      )}
    </FieldSet>
  )
}

function TextField({
  number,
  question,
  onAnswered,
}: {
  number: number
  question: TextQuestion
  onAnswered: Mark
}) {
  const [words, setWords] = useState(0)
  const id = `answer-${question.id}`
  const size = answerSize(question)
  const outside =
    words > 0 && (words > question.maxWords || words < question.minWords)
  const read = (value: string) => {
    const next = countWords(value)
    setWords(next)
    onAnswered(question.id, next > 0)
  }
  const shared = {
    id,
    name: `answer.${question.id}`,
    required: question.required,
    "aria-invalid": outside || undefined,
    "aria-describedby": `${id}-limit`,
  }

  return (
    <Field className="gap-3">
      <FieldLabel
        htmlFor={id}
        className="flex-wrap items-baseline gap-x-2 gap-y-1 leading-snug"
      >
        <Prompt number={number} question={question} />
      </FieldLabel>
      {size === "line" ? (
        <Input
          {...shared}
          autoComplete="off"
          className="lg:max-w-md"
          onChange={(event) => read(event.target.value)}
        />
      ) : (
        <Textarea
          {...shared}
          className={size === "long" ? "min-h-32" : "min-h-20"}
          onChange={(event) => read(event.target.value)}
        />
      )}
      <div
        id={`${id}-limit`}
        aria-live="polite"
        className={cn(
          "flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs",
          outside ? "text-destructive" : "text-muted-foreground",
          size === "line" && "lg:max-w-md",
          size === "line" && !outside && question.minWords <= 1 && "sr-only"
        )}
      >
        <span>{wordLimitLabel(question)}</span>
        <span className="tabular-nums">
          {words} of {question.maxWords} words
        </span>
      </div>
    </Field>
  )
}
