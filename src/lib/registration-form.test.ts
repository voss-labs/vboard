import { describe, expect, it } from "vitest"
import {
  MAX_QUESTIONS,
  countWords,
  keepsAnsweredQuestions,
  normalizeAnswer,
  questionsSchema,
  validateAnswers,
  wordLimitLabel,
  type RegistrationQuestion,
} from "@/lib/registration-form"

const ROLE = "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11"
const ABOUT = "8a2d4e61-9c3f-4b5a-a7d2-1e0f3c5b7d22"
const EXTRA = "c1e7a9b3-5d2f-4a86-b0c4-7f3e1d9a5b33"

const role: RegistrationQuestion = {
  id: ROLE,
  type: "choice",
  label: "Which role do you want to interview for?",
  required: true,
  options: ["Frontend", "Backend", "Design"],
}
const about: RegistrationQuestion = {
  id: ABOUT,
  type: "text",
  label: "Tell us about yourself",
  required: false,
  minWords: 3,
  maxWords: 5,
}
const reader = (values: Record<string, unknown>) => (id: string) => values[id]

describe("questionsSchema", () => {
  it("accepts a choice and a text question and trims their text", () => {
    const result = questionsSchema.safeParse([
      { ...role, label: "  Role  ", options: [" Frontend ", "Backend"] },
      about,
    ])
    expect(result.success).toBe(true)
    expect(result.data?.[0]).toMatchObject({
      label: "Role",
      options: ["Frontend", "Backend"],
    })
  })

  it("accepts an event without questions", () => {
    expect(questionsSchema.parse([])).toEqual([])
  })

  it("rejects duplicate question ids", () => {
    expect(
      questionsSchema.safeParse([role, { ...about, id: ROLE }]).success
    ).toBe(false)
    expect(
      questionsSchema.safeParse([role, { ...about, id: ROLE.toUpperCase() }])
        .success
    ).toBe(false)
  })

  it("rejects an id that is not a uuid", () => {
    expect(questionsSchema.safeParse([{ ...role, id: "role" }]).success).toBe(
      false
    )
  })

  it("rejects fewer than two choices", () => {
    expect(
      questionsSchema.safeParse([{ ...role, options: ["Frontend"] }]).success
    ).toBe(false)
  })

  it("rejects repeated or blank choices", () => {
    expect(
      questionsSchema.safeParse([
        { ...role, options: ["Frontend", "Frontend"] },
      ]).success
    ).toBe(false)
    expect(
      questionsSchema.safeParse([
        { ...role, options: ["Frontend", " Frontend "] },
      ]).success
    ).toBe(false)
    expect(
      questionsSchema.safeParse([{ ...role, options: ["Frontend", "  "] }])
        .success
    ).toBe(false)
  })

  it("rejects a minimum above the maximum", () => {
    expect(
      questionsSchema.safeParse([{ ...about, minWords: 6, maxWords: 5 }])
        .success
    ).toBe(false)
  })

  it("rejects fractional or missing word limits", () => {
    expect(
      questionsSchema.safeParse([{ ...about, maxWords: 2.5 }]).success
    ).toBe(false)
    const { maxWords: _maxWords, ...withoutMaximum } = about
    expect(questionsSchema.safeParse([withoutMaximum]).success).toBe(false)
  })

  it("rejects more questions than the limit", () => {
    const many = Array.from({ length: MAX_QUESTIONS + 1 }, (_, i) => ({
      ...about,
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    }))
    expect(questionsSchema.safeParse(many).success).toBe(false)
    expect(questionsSchema.safeParse(many.slice(1)).success).toBe(true)
  })

  it("rejects unknown keys, unknown types and blank labels", () => {
    expect(
      questionsSchema.safeParse([{ ...role, approved: true }]).success
    ).toBe(false)
    expect(questionsSchema.safeParse([{ ...role, minWords: 1 }]).success).toBe(
      false
    )
    expect(
      questionsSchema.safeParse([{ ...role, type: "upload" }]).success
    ).toBe(false)
    expect(questionsSchema.safeParse([{ ...role, label: "   " }]).success).toBe(
      false
    )
  })
})

describe("normalizeAnswer and countWords", () => {
  it("collapses tabs, non-breaking spaces and repeated spaces", () => {
    expect(normalizeAnswer("  hello \t world  again  ")).toBe(
      "hello world again"
    )
    expect(countWords("one\ttwo three   four")).toBe(4)
  })

  it("turns CRLF into newlines and keeps blank lines", () => {
    expect(normalizeAnswer("one\r\ntwo\rthree\n\nfour\r\n")).toBe(
      "one\ntwo\nthree\n\nfour"
    )
    expect(countWords("one\r\ntwo\n\n three")).toBe(3)
  })

  it("counts nothing in an empty or blank answer", () => {
    expect(countWords("")).toBe(0)
    expect(countWords(" \n\t ")).toBe(0)
    expect(normalizeAnswer(" \n\t ")).toBe("")
  })
})

describe("wordLimitLabel", () => {
  it("describes a range or a ceiling", () => {
    expect(wordLimitLabel({ minWords: 200, maxWords: 300 })).toBe(
      "200 to 300 words"
    )
    expect(wordLimitLabel({ minWords: 0, maxWords: 300 })).toBe(
      "Up to 300 words"
    )
  })
})

describe("validateAnswers", () => {
  const questions = [role, about]

  it("returns normalized answers keyed by question", () => {
    expect(
      validateAnswers(
        questions,
        reader({ [ROLE]: " Backend ", [ABOUT]: "I  build\tweb apps" })
      )
    ).toEqual({
      ok: true,
      answers: { [ROLE]: "Backend", [ABOUT]: "I build web apps" },
    })
  })

  it("rejects a missing required answer", () => {
    const result = validateAnswers(questions, reader({ [ABOUT]: "a b c" }))
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining(role.label) })
  })

  it("omits a blank optional answer", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: "Design", [ABOUT]: "  " }))
    ).toEqual({ ok: true, answers: { [ROLE]: "Design" } })
  })

  it("rejects a choice outside the options", () => {
    expect(validateAnswers(questions, reader({ [ROLE]: "Marketing" })).ok).toBe(
      false
    )
    expect(validateAnswers(questions, reader({ [ROLE]: "frontend" })).ok).toBe(
      false
    )
  })

  it("enforces the word limits at their exact boundaries", () => {
    const check = (text: string) =>
      validateAnswers(questions, reader({ [ROLE]: "Design", [ABOUT]: text })).ok
    expect(check("one two")).toBe(false)
    expect(check("one two three")).toBe(true)
    expect(check("one two three four five")).toBe(true)
    expect(check("one two three four five six")).toBe(false)
  })

  it("treats non-string input as unanswered", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: ["Design"], [ABOUT]: 42 })).ok
    ).toBe(false)
    expect(
      validateAnswers(questions, reader({ [ROLE]: "Design", [ABOUT]: null }))
    ).toEqual({ ok: true, answers: { [ROLE]: "Design" } })
  })

  it("ignores answers to questions the event does not ask", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: "Design", [EXTRA]: "x" }))
    ).toEqual({ ok: true, answers: { [ROLE]: "Design" } })
  })

  it("accepts an event without questions", () => {
    expect(validateAnswers([], reader({}))).toEqual({ ok: true, answers: {} })
  })
})

describe("keepsAnsweredQuestions", () => {
  const previous = [role, about]

  it("allows rewording, a new choice and a new question", () => {
    expect(
      keepsAnsweredQuestions(previous, [
        { ...role, label: "Preferred role", options: [...role.options, "QA"] },
        { ...about, label: "About you", required: true },
        { ...role, id: EXTRA, label: "Year" },
      ])
    ).toBe(true)
  })

  it("rejects removing a question", () => {
    expect(keepsAnsweredQuestions(previous, [role])).toBe(false)
    expect(keepsAnsweredQuestions(previous, [])).toBe(false)
  })

  it("allows removing or renaming a choice", () => {
    expect(
      keepsAnsweredQuestions(previous, [
        { ...role, options: ["Frontend", "Backend"] },
        about,
      ])
    ).toBe(true)
    expect(
      keepsAnsweredQuestions(previous, [
        { ...role, options: ["Frontend", "Backend", "UI design"] },
        about,
      ])
    ).toBe(true)
  })

  it("rejects changing a question's type", () => {
    expect(
      keepsAnsweredQuestions(previous, [
        { ...about, id: ROLE },
        { ...about, id: ABOUT },
      ])
    ).toBe(false)
  })

  it("allows any change when nothing was asked before", () => {
    expect(keepsAnsweredQuestions([], [])).toBe(true)
    expect(keepsAnsweredQuestions([], [role])).toBe(true)
  })
})
