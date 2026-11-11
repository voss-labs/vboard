import { describe, expect, it } from "vitest"
import {
  academicDate,
  academicDay,
  divisionOf,
  isProfileComplete,
  onboardingPath,
  studyYearLabel,
} from "@/lib/profile"

const complete = {
  rollNumber: "23102A0054",
  department: "CMPN",
  cohortYear: 2023,
}

describe("isProfileComplete", () => {
  it("needs a valid roll number, a department and a year", () => {
    expect(isProfileComplete(complete)).toBe(true)
    expect(isProfileComplete({ ...complete, rollNumber: null })).toBe(false)
    expect(isProfileComplete({ ...complete, department: null })).toBe(false)
    expect(isProfileComplete({ ...complete, cohortYear: null })).toBe(false)
  })

  it("treats an older roll number that no longer parses as incomplete", () => {
    expect(isProfileComplete({ ...complete, rollNumber: "220189" })).toBe(false)
    expect(isProfileComplete({ ...complete, rollNumber: "23999A0001" })).toBe(
      false
    )
  })
})

describe("academic date", () => {
  it("uses the India calendar day", () => {
    expect(academicDate(new Date("2026-05-31T19:00:00Z"))).toBe("2026-06-01")
    expect(academicDay("2026-06-01").getMonth()).toBe(5)
  })
})

describe("organizer labels", () => {
  const on = academicDay("2026-11-11")

  it("labels the year from the stored cohort", () => {
    expect(studyYearLabel(2024, on)).toBe("Third year")
    expect(studyYearLabel(2020, on)).toBeNull()
    expect(studyYearLabel(null, on)).toBeNull()
  })

  it("reads the division from the roll number", () => {
    expect(divisionOf("23102B0054")).toBe("B")
    expect(divisionOf("220189")).toBeNull()
    expect(divisionOf(null)).toBeNull()
  })
})

describe("onboardingPath", () => {
  it("carries the return path as one encoded parameter", () => {
    expect(onboardingPath("/posts/hack-night?ref=a&b=c")).toBe(
      "/onboarding?next=%2Fposts%2Fhack-night%3Fref%3Da%26b%3Dc"
    )
  })
})
