import { describe, expect, it } from "vitest"
import {
  MAX_QUESTIONS,
  answerLabels,
  countWords,
  keepsAnsweredQuestions,
  normalizeAnswer,
  pickedChoices,
  questionsSchema,
  validateAnswers,
  wordLimitLabel,
  type RegistrationQuestion,
} from "@/lib/registration-form"

const ROLE = "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11"
const ABOUT = "8a2d4e61-9c3f-4b5a-a7d2-1e0f3c5b7d22"
const EXTRA = "c1e7a9b3-5d2f-4a86-b0c4-7f3e1d9a5b33"

const FRONTEND = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "Frontend",
}
const BACKEND = { id: "22222222-2222-4222-8222-222222222222", label: "Backend" }
const DESIGN = { id: "33333333-3333-4333-8333-333333333333", label: "Design" }
const QA = { id: "44444444-4444-4444-8444-444444444444", label: "QA" }

const role: RegistrationQuestion = {
  id: ROLE,
  type: "choice",
  label: "Which role do you want to interview for?",
  required: true,
  options: [FRONTEND, BACKEND, DESIGN],
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
      {
        ...role,
        label: "  Role  ",
        options: [{ ...FRONTEND, label: " Frontend " }, BACKEND],
      },
      about,
    ])
    expect(result.success).toBe(true)
    expect(result.data?.[0]).toMatchObject({
      label: "Role",
      options: [FRONTEND, BACKEND],
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
      questionsSchema.safeParse([{ ...role, options: [FRONTEND] }]).success
    ).toBe(false)
  })

  it("rejects repeated, blank or malformed choices", () => {
    for (const options of [
      [FRONTEND, { ...BACKEND, label: "Frontend" }],
      [FRONTEND, { ...BACKEND, label: " Frontend " }],
      [FRONTEND, { ...BACKEND, label: "  " }],
      [FRONTEND, { ...BACKEND, id: FRONTEND.id }],
      [FRONTEND, { ...BACKEND, id: FRONTEND.id.toUpperCase() }],
      [FRONTEND, { ...BACKEND, id: "backend" }],
      [FRONTEND, { ...BACKEND, picked: true }],
      ["Frontend", "Backend"],
    ])
      expect(questionsSchema.safeParse([{ ...role, options }]).success).toBe(
        false
      )
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
        reader({ [ROLE]: ` ${BACKEND.id} `, [ABOUT]: "I  build\tweb apps" })
      )
    ).toEqual({
      ok: true,
      answers: { [ROLE]: BACKEND.id, [ABOUT]: "I build web apps" },
    })
  })

  it("rejects a missing required answer", () => {
    const result = validateAnswers(questions, reader({ [ABOUT]: "a b c" }))
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ error: expect.stringContaining(role.label) })
  })

  it("omits a blank optional answer", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: DESIGN.id, [ABOUT]: "  " }))
    ).toEqual({ ok: true, answers: { [ROLE]: DESIGN.id } })
  })

  it("rejects a choice outside the options", () => {
    expect(validateAnswers(questions, reader({ [ROLE]: QA.id })).ok).toBe(false)
    expect(validateAnswers(questions, reader({ [ROLE]: "Frontend" })).ok).toBe(
      false
    )
  })

  it("enforces the word limits at their exact boundaries", () => {
    const check = (text: string) =>
      validateAnswers(questions, reader({ [ROLE]: DESIGN.id, [ABOUT]: text }))
        .ok
    expect(check("one two")).toBe(false)
    expect(check("one two three")).toBe(true)
    expect(check("one two three four five")).toBe(true)
    expect(check("one two three four five six")).toBe(false)
  })

  it("treats non-string input as unanswered", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: [DESIGN.id], [ABOUT]: 42 }))
        .ok
    ).toBe(false)
    expect(
      validateAnswers(questions, reader({ [ROLE]: DESIGN.id, [ABOUT]: null }))
    ).toEqual({ ok: true, answers: { [ROLE]: DESIGN.id } })
  })

  it("ignores answers to questions the event does not ask", () => {
    expect(
      validateAnswers(questions, reader({ [ROLE]: DESIGN.id, [EXTRA]: "x" }))
    ).toEqual({ ok: true, answers: { [ROLE]: DESIGN.id } })
  })

  it("accepts an event without questions", () => {
    expect(validateAnswers([], reader({}))).toEqual({ ok: true, answers: {} })
  })
})

describe("answerLabels and pickedChoices", () => {
  const given = { [ROLE]: BACKEND.id, [ABOUT]: "I build web apps" }

  it("shows the current wording of the choice a student picked", () => {
    expect(answerLabels([role, about], given)).toEqual({
      [ROLE]: "Backend",
      [ABOUT]: "I build web apps",
    })
    const renamed = {
      ...role,
      options: [FRONTEND, { ...BACKEND, label: "API" }],
    }
    expect(answerLabels([renamed, about], given)[ROLE]).toBe("API")
  })

  it("leaves out unanswered questions", () => {
    expect(answerLabels([role, about], { [ROLE]: DESIGN.id })).toEqual({
      [ROLE]: "Design",
    })
  })

  it("lists the choices students picked, not their text answers", () => {
    expect(
      pickedChoices([role, about], [given, { [ROLE]: BACKEND.id }, {}])
    ).toEqual([BACKEND.id])
  })
})

describe("keepsAnsweredQuestions", () => {
  const previous = [role, about]
  const answers = [{ [ROLE]: BACKEND.id, [ABOUT]: "I build web apps" }]

  it("allows rewording, a new choice and a new question", () => {
    expect(
      keepsAnsweredQuestions(
        previous,
        [
          {
            ...role,
            label: "Preferred role",
            options: [FRONTEND, { ...BACKEND, label: "API" }, DESIGN, QA],
          },
          { ...about, label: "About you", required: true },
          { ...role, id: EXTRA, label: "Year" },
        ],
        answers
      )
    ).toBe(true)
  })

  it("rejects removing a question", () => {
    expect(keepsAnsweredQuestions(previous, [role], answers)).toBe(false)
    expect(keepsAnsweredQuestions(previous, [], answers)).toBe(false)
  })

  it("allows removing a choice nobody picked", () => {
    expect(
      keepsAnsweredQuestions(
        previous,
        [{ ...role, options: [BACKEND, DESIGN] }, about],
        answers
      )
    ).toBe(true)
  })

  it("rejects removing a choice someone picked", () => {
    expect(
      keepsAnsweredQuestions(
        previous,
        [{ ...role, options: [FRONTEND, DESIGN] }, about],
        answers
      )
    ).toBe(false)
  })

  it("rejects changing a question's type", () => {
    expect(
      keepsAnsweredQuestions(
        previous,
        [
          { ...about, id: ROLE },
          { ...about, id: ABOUT },
        ],
        answers
      )
    ).toBe(false)
  })

  it("allows any change when nothing was asked before", () => {
    expect(keepsAnsweredQuestions([], [], [])).toBe(true)
    expect(keepsAnsweredQuestions([], [role], [])).toBe(true)
  })
})
