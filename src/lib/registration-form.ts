import { z } from "zod"

export const MAX_QUESTIONS = 10
export const MAX_OPTIONS = 12
export const MAX_WORD_LIMIT = 1000
export const DEFAULT_MAX_WORDS = 300

const label = z
  .string()
  .trim()
  .min(1, "Every question needs a label")
  .max(200, "Keep question labels under 200 characters")

const choiceQuestion = z
  .object({
    id: z.uuid(),
    type: z.literal("choice"),
    label,
    required: z.boolean(),
    options: z
      .array(
        z
          .object({
            id: z.uuid(),
            label: z
              .string()
              .trim()
              .min(1, "Choices cannot be empty")
              .max(100, "Keep choices under 100 characters"),
          })
          .strict()
      )
      .min(2, "A choice question needs at least two choices")
      .max(MAX_OPTIONS, `A question can have at most ${MAX_OPTIONS} choices`),
  })
  .strict()

const textQuestion = z
  .object({
    id: z.uuid(),
    type: z.literal("text"),
    label,
    required: z.boolean(),
    minWords: z.number().int().min(0).max(MAX_WORD_LIMIT),
    maxWords: z.number().int().min(1).max(MAX_WORD_LIMIT),
  })
  .strict()

export const questionsSchema = z
  .array(z.discriminatedUnion("type", [choiceQuestion, textQuestion]))
  .max(MAX_QUESTIONS, `An event can ask at most ${MAX_QUESTIONS} questions`)
  .superRefine((questions, ctx) => {
    const ids = new Set(questions.map((q) => q.id.toLowerCase()))
    if (ids.size !== questions.length)
      ctx.addIssue({ code: "custom", message: "Questions must be distinct" })
    for (const q of questions) {
      if (
        q.type === "choice" &&
        (distinct(q.options.map((o) => o.label)) !== q.options.length ||
          distinct(q.options.map((o) => o.id.toLowerCase())) !==
            q.options.length)
      )
        ctx.addIssue({
          code: "custom",
          message: `"${q.label}" repeats a choice`,
        })
      if (q.type === "text" && q.minWords > q.maxWords)
        ctx.addIssue({
          code: "custom",
          message: `"${q.label}" has a minimum above its maximum`,
        })
    }
  })

export type RegistrationQuestion = z.infer<typeof questionsSchema>[number]
export type RegistrationAnswers = Record<string, string>

function distinct(values: string[]): number {
  return new Set(values).size
}

export function normalizeAnswer(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim()
}

export function countWords(value: string): number {
  return normalizeAnswer(value)
    .split(/[ \n]+/)
    .filter(Boolean).length
}

export function answerSize(question: {
  maxWords: number
}): "line" | "short" | "long" {
  if (question.maxWords <= 12) return "line"
  return question.maxWords <= 80 ? "short" : "long"
}

export function wordLimitLabel(question: {
  minWords: number
  maxWords: number
}): string {
  return question.minWords > 0
    ? `${question.minWords} to ${question.maxWords} words`
    : `Up to ${question.maxWords} words`
}

export function validateAnswers(
  questions: RegistrationQuestion[],
  read: (questionId: string) => unknown
): { ok: true; answers: RegistrationAnswers } | { ok: false; error: string } {
  const answers: RegistrationAnswers = {}
  for (const q of questions) {
    const raw = read(q.id)
    const value = normalizeAnswer(typeof raw === "string" ? raw : "")
    if (value === "") {
      if (q.required) return { ok: false, error: `Answer "${q.label}".` }
      continue
    }
    if (q.type === "choice") {
      if (!q.options.some((option) => option.id === value))
        return { ok: false, error: `Pick one of the choices for "${q.label}".` }
    } else {
      const words = countWords(value)
      if (words > q.maxWords)
        return {
          ok: false,
          error: `"${q.label}" allows at most ${q.maxWords} words. You wrote ${words}.`,
        }
      if (words < q.minWords)
        return {
          ok: false,
          error: `"${q.label}" needs at least ${q.minWords} words. You wrote ${words}.`,
        }
    }
    answers[q.id] = value
  }
  return { ok: true, answers }
}

export function answerLabels(
  questions: RegistrationQuestion[],
  answers: RegistrationAnswers
): RegistrationAnswers {
  const labels: RegistrationAnswers = {}
  for (const q of questions) {
    const answer = answers[q.id]
    if (!answer) continue
    const label =
      q.type === "choice"
        ? q.options.find((option) => option.id === answer)?.label
        : answer
    if (label) labels[q.id] = label
  }
  return labels
}

export function pickedChoices(
  questions: RegistrationQuestion[],
  answers: RegistrationAnswers[]
): string[] {
  const picked = new Set<string>()
  for (const q of questions)
    if (q.type === "choice")
      for (const given of answers) if (given[q.id]) picked.add(given[q.id])
  return [...picked]
}

export function keepsAnsweredQuestions(
  previous: RegistrationQuestion[],
  next: RegistrationQuestion[],
  answers: RegistrationAnswers[]
): boolean {
  return previous.every((old) => {
    const kept = next.find((q) => q.id === old.id && q.type === old.type)
    if (!kept) return false
    if (kept.type !== "choice") return true
    return answers.every(
      (given) =>
        !given[old.id] ||
        kept.options.some((option) => option.id === given[old.id])
    )
  })
}
