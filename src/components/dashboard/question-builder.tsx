"use client"

import { useState } from "react"
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  DEFAULT_MAX_WORDS,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MAX_WORD_LIMIT,
  type RegistrationQuestion,
} from "@/lib/registration-form"

type Draft = {
  id: string
  type: "choice" | "text"
  label: string
  required: boolean
  options: string[]
  minWords: string
  maxWords: string
}

function toDraft(question: RegistrationQuestion): Draft {
  return {
    id: question.id,
    type: question.type,
    label: question.label,
    required: question.required,
    options: question.type === "choice" ? question.options : [],
    minWords: question.type === "text" ? String(question.minWords) : "0",
    maxWords:
      question.type === "text"
        ? String(question.maxWords)
        : String(DEFAULT_MAX_WORDS),
  }
}

function serialize(drafts: Draft[]): string {
  return JSON.stringify(
    drafts.map((d) =>
      d.type === "choice"
        ? {
            id: d.id,
            type: d.type,
            label: d.label,
            required: d.required,
            options: d.options,
          }
        : {
            id: d.id,
            type: d.type,
            label: d.label,
            required: d.required,
            minWords: Number(d.minWords || 0),
            maxWords: Number(d.maxWords || DEFAULT_MAX_WORDS),
          }
    )
  )
}

function keepInForm(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault()
}

export function QuestionBuilder({
  initial,
  locked,
}: {
  initial: RegistrationQuestion[]
  locked: boolean
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map(toDraft))
  const frozen = new Map(
    locked
      ? initial.map((q) => [q.id, q.type === "choice" ? q.options.length : 0])
      : []
  )
  const patch = (id: string, change: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...change } : d))
    )
  const add = (type: Draft["type"]) =>
    setDrafts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        label: "",
        required: true,
        options: type === "choice" ? ["", ""] : [],
        minWords: "0",
        maxWords: String(DEFAULT_MAX_WORDS),
      },
    ])
  const [fresh, setFresh] = useState<string | null>(null)
  const full = drafts.length >= MAX_QUESTIONS

  return (
    <div className="flex flex-col gap-4">
      <input
        type="hidden"
        name="registrationQuestions"
        value={serialize(drafts)}
      />
      {frozen.size > 0 && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          Students have already answered. You can reword questions and add new
          questions or choices, but not remove what they answered.
        </p>
      )}
      {drafts.length === 0 && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          This event registers in one click unless you add questions.
        </p>
      )}
      {drafts.map((d, index) => {
        const frozenOptions = frozen.get(d.id) ?? 0
        return (
          <div
            key={d.id}
            className="flex min-w-0 flex-col gap-4 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {d.type === "choice" ? "Choice" : "Text"}
              </Badge>
              <span className="text-muted-foreground mr-auto text-xs">
                Question {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={frozen.has(d.id)}
                aria-label={`Remove question ${index + 1}`}
                onClick={() =>
                  setDrafts((prev) => prev.filter((x) => x.id !== d.id))
                }
              >
                <Trash2Icon />
              </Button>
            </div>
            <Field>
              <FieldLabel htmlFor={`question-${d.id}`}>Question</FieldLabel>
              <Input
                id={`question-${d.id}`}
                value={d.label}
                onChange={(e) => patch(d.id, { label: e.target.value })}
                onKeyDown={keepInForm}
                placeholder={
                  d.type === "choice"
                    ? "Which role do you want to interview for?"
                    : "Tell us about yourself"
                }
                required
                maxLength={200}
              />
            </Field>
            {d.type === "choice" ? (
              <Field>
                <FieldLabel>Choices</FieldLabel>
                <div className="flex flex-col gap-2">
                  {d.options.map((option, at) => (
                    <div key={at} className="flex items-center gap-2">
                      <Input
                        ref={
                          fresh === `${d.id}:${at}`
                            ? (element) => element?.focus()
                            : undefined
                        }
                        value={option}
                        onChange={(e) =>
                          patch(d.id, {
                            options: d.options.map((o, i) =>
                              i === at ? e.target.value : o
                            ),
                          })
                        }
                        onKeyDown={keepInForm}
                        aria-label={`Choice ${at + 1} of question ${index + 1}`}
                        placeholder={`Choice ${at + 1}`}
                        readOnly={at < frozenOptions}
                        required
                        maxLength={100}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={at < frozenOptions || d.options.length <= 2}
                        aria-label={`Remove choice ${at + 1} of question ${index + 1}`}
                        onClick={() =>
                          patch(d.id, {
                            options: d.options.filter((_, i) => i !== at),
                          })
                        }
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={d.options.length >= MAX_OPTIONS}
                  onClick={() => {
                    setFresh(`${d.id}:${d.options.length}`)
                    patch(d.id, { options: [...d.options, ""] })
                  }}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add choice
                </Button>
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={`min-${d.id}`}>Minimum words</FieldLabel>
                  <Input
                    id={`min-${d.id}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={Number(d.maxWords) || MAX_WORD_LIMIT}
                    step={1}
                    value={d.minWords}
                    onChange={(e) => patch(d.id, { minWords: e.target.value })}
                    onKeyDown={keepInForm}
                    required
                  />
                  <FieldDescription>0 sets no minimum.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`max-${d.id}`}>Maximum words</FieldLabel>
                  <Input
                    id={`max-${d.id}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_WORD_LIMIT}
                    step={1}
                    value={d.maxWords}
                    onChange={(e) => patch(d.id, { maxWords: e.target.value })}
                    onKeyDown={keepInForm}
                    required
                  />
                </Field>
              </div>
            )}
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={`required-${d.id}`}>Required</FieldLabel>
              </FieldContent>
              <Switch
                id={`required-${d.id}`}
                checked={d.required}
                onCheckedChange={(on) => patch(d.id, { required: on })}
              />
            </Field>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => add("choice")}
        >
          <PlusIcon data-icon="inline-start" />
          Add choice question
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={full}
          onClick={() => add("text")}
        >
          <PlusIcon data-icon="inline-start" />
          Add text question
        </Button>
      </div>
      {full && (
        <p className="text-muted-foreground text-xs">
          An event can ask at most {MAX_QUESTIONS} questions.
        </p>
      )}
    </div>
  )
}
