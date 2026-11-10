import { describe, expect, it } from "vitest"
import {
  memberFormSchema,
  newCommunitySchema,
  postFormSchema,
  profileFormSchema,
} from "@/db/validations"

const base = {
  title: "Build with Gemma",
  body: "Workshop",
  visibility: "public",
  locationVisibility: "public",
  startsAt: "",
  endsAt: "",
  location: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: "",
  registrationQuestions: "",
  intent: "publish",
}
const event = {
  ...base,
  isEvent: "on",
  startsAt: "2026-10-01T10:00",
  endsAt: "2026-10-01T12:00",
}
const questions = [
  {
    id: "5f0c1a52-3b7e-4c7a-9d1e-2a6b8c4d0e11",
    type: "choice",
    label: "Which role do you want to interview for?",
    required: true,
    options: ["Frontend", "Backend"],
  },
  {
    id: "8a2d4e61-9c3f-4b5a-a7d2-1e0f3c5b7d22",
    type: "text",
    label: "Tell us about yourself",
    required: true,
    minWords: 200,
    maxWords: 300,
  },
]

describe("postFormSchema", () => {
  it("accepts a text post and clears event fields", () => {
    const result = postFormSchema.safeParse({
      ...base,
      startsAt: "2026-10-01T10:00",
    })
    expect(result.success).toBe(true)
    expect(result.data?.startsAt).toBeNull()
  })

  it("requires start and end for an event", () => {
    const result = postFormSchema.safeParse({ ...base, isEvent: "on" })
    expect(result.success).toBe(false)
  })

  it("rejects an event that ends before it starts", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T09:00",
    })
    expect(result.success).toBe(false)
  })

  it("parses a valid event in IST", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T12:00",
      capacity: "40",
      requiresApproval: "on",
    })
    expect(result.success).toBe(true)
    expect(result.data?.startsAt?.toISOString()).toBe(
      "2026-10-01T04:30:00.000Z"
    )
    expect(result.data?.capacity).toBe(40)
    expect(result.data?.requiresApproval).toBe(true)
  })

  it("rejects a fractional capacity", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T12:00",
      capacity: "2.5",
    })
    expect(result.success).toBe(false)
  })
})

describe("postFormSchema registration questions", () => {
  it("parses questions sent as a JSON string", () => {
    const result = postFormSchema.safeParse({
      ...event,
      registrationQuestions: JSON.stringify(questions),
    })
    expect(result.success).toBe(true)
    expect(result.data?.registrationQuestions).toEqual(questions)
  })

  it("treats a blank field as no questions", () => {
    expect(postFormSchema.parse(event).registrationQuestions).toEqual([])
  })

  it("rejects malformed JSON", () => {
    const result = postFormSchema.safeParse({
      ...event,
      registrationQuestions: '[{"id":',
    })
    expect(result.success).toBe(false)
  })

  it("rejects JSON that is not a list of valid questions", () => {
    for (const value of [
      "{}",
      '"text"',
      JSON.stringify([{ ...questions[0], options: ["Frontend"] }]),
      JSON.stringify([{ ...questions[1], minWords: 400 }]),
      JSON.stringify([questions[0], questions[0]]),
    ])
      expect(
        postFormSchema.safeParse({ ...event, registrationQuestions: value })
          .success
      ).toBe(false)
  })

  it("drops questions from an announcement", () => {
    const result = postFormSchema.safeParse({
      ...base,
      registrationQuestions: JSON.stringify(questions),
    })
    expect(result.success).toBe(true)
    expect(result.data?.registrationQuestions).toEqual([])
  })

  it("requires the field to be a string", () => {
    expect(
      postFormSchema.safeParse({ ...event, registrationQuestions: questions })
        .success
    ).toBe(false)
  })
})

describe("newCommunitySchema", () => {
  it("rejects a slug with spaces", () => {
    const result = newCommunitySchema.safeParse({
      name: "Coding Club",
      slug: "coding club",
      description: "",
      leadEmail: "",
    })
    expect(result.success).toBe(false)
  })

  it("allows a community without a lead", () => {
    const result = newCommunitySchema.safeParse({
      name: "Coding Club",
      slug: "coding-club",
      description: "",
      leadEmail: "",
    })
    expect(result.success).toBe(true)
    expect(result.data?.leadEmail).toBeNull()
  })
})

describe("strict writable field boundaries", () => {
  it("rejects client authority fields on profile and post input", () => {
    expect(
      profileFormSchema.safeParse({
        rollNumber: "",
        bio: "",
        siteRole: "super_admin",
      }).success
    ).toBe(false)
    expect(
      postFormSchema.safeParse({ ...base, authorId: "forged" }).success
    ).toBe(false)
  })
  it("accepts only current schema community roles", () => {
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "organizer",
      }).success
    ).toBe(true)
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "manager",
      }).success
    ).toBe(false)
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "organizer",
        addedBy: "forged",
      }).success
    ).toBe(false)
  })
})

describe("profileFormSchema", () => {
  it("rejects a submitted department instead of treating it as authoritative", () => {
    expect(
      profileFormSchema.safeParse({
        rollNumber: "23108A0054",
        department: "CIVIL",
        bio: "",
      }).success
    ).toBe(false)
  })

  it.each([
    ["23101C0001", "IT"],
    ["23102C0001", "CMPN"],
    ["23104B0001", "EXTC"],
    ["23105A0001", "BIOMED"],
    ["23108B0001", "EXCS"],
    ["23103A0001", "EXCS"],
  ])("derives %s as %s", (rollNumber, department) => {
    expect(profileFormSchema.parse({ rollNumber, bio: "" })).toEqual({
      rollNumber,
      department,
      bio: null,
    })
  })
})
