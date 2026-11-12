import { describe, expect, it } from "vitest"
import {
  cohortYearFor,
  currentYear,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  expectedYear,
  rollStudyYear,
  studyYear,
  parseRollNumber,
} from "@/lib/roll-number"

describe("departments", () => {
  it("exposes the five college departments and their display labels", () => {
    expect(DEPARTMENTS).toEqual(["BIOMED", "EXCS", "EXTC", "CMPN", "IT"])
    expect(DEPARTMENT_LABELS).toEqual({
      BIOMED: "Bio-med",
      EXCS: "EXCS",
      EXTC: "EXTC",
      CMPN: "CMPN",
      IT: "IT",
    })
  })
})

describe("parseRollNumber", () => {
  it.each([
    ["101", "IT"],
    ["102", "CMPN"],
    ["103", "EXCS"],
    ["104", "EXTC"],
    ["105", "BIOMED"],
    ["108", "EXCS"],
  ])("maps branch %s to %s", (branchCode, department) => {
    expect(parseRollNumber(`26${branchCode}B0012`)).toEqual({
      admissionYear: 2026,
      branchCode,
      department,
      division: "B",
      classNumber: 12,
      isDSY: false,
    })
  })

  it("normalizes surrounding whitespace and lowercase divisions", () => {
    expect(parseRollNumber("  26101a0001\n")).toMatchObject({
      admissionYear: 2026,
      department: "IT",
      division: "A",
      classNumber: 1,
    })
  })

  it.each(["101", "102", "103", "104", "105", "108"])(
    "accepts any division letter for branch %s",
    (code) => {
      for (const division of ["A", "C", "D", "H", "Z"])
        expect(parseRollNumber(`26${code}${division}0001`)?.division).toBe(
          division
        )
    }
  )

  it("accepts a first-year EXCS roll number in division C", () => {
    expect(parseRollNumber("26108C0085")).toMatchObject({
      admissionYear: 2026,
      department: "EXCS",
      division: "C",
    })
  })

  it("preserves an unknown branch without inferring a department", () => {
    expect(parseRollNumber("26999C0001")).toEqual({
      admissionYear: 2026,
      branchCode: "999",
      department: null,
      division: "C",
      classNumber: 1,
      isDSY: false,
    })
  })

  it.each([
    "",
    "26101A001",
    "26101A00012",
    "2610110001",
    "26101AA001",
    "26 101A0001",
  ])("rejects malformed roll number %j", (raw) => {
    expect(parseRollNumber(raw)).toBeNull()
  })

  it.each([
    ["1999", false],
    ["2000", true],
    ["2001", true],
  ])("detects DSY at class number %s", (classNumber, isDSY) => {
    expect(parseRollNumber(`26101A${classNumber}`)?.isDSY).toBe(isDSY)
  })
})

describe("expectedYear", () => {
  const academicYear = new Date(2026, 5, 1)

  it.each([
    [2026, "FE"],
    [2025, "SE"],
    [2024, "TE"],
    [2023, "BE"],
  ])("places the %s cohort in %s", (admissionYear, year) => {
    expect(expectedYear(admissionYear, academicYear)).toBe(year)
  })

  it("advances the academic year on June 1", () => {
    expect(expectedYear(2025, new Date(2026, 4, 31, 23, 59, 59))).toBe("FE")
    expect(expectedYear(2025, new Date(2026, 5, 1))).toBe("SE")
  })

  it("returns null for future and completed cohorts", () => {
    expect(expectedYear(2027, academicYear)).toBeNull()
    expect(expectedYear(2022, academicYear)).toBeNull()
  })
})

describe("currentYear", () => {
  const academicYear = new Date(2026, 5, 1)

  it("places DSY students one level ahead of regular entrants", () => {
    expect(currentYear("26101A1999", academicYear)).toBe("FE")
    expect(currentYear("26101A2000", academicYear)).toBe("SE")
    expect(currentYear("24101A2000", academicYear)).toBe("BE")
  })

  it("advances DSY students at the June academic-year boundary", () => {
    expect(currentYear("25101A2000", new Date(2026, 4, 31))).toBe("SE")
    expect(currentYear("25101A2000", academicYear)).toBe("TE")
  })

  it("returns null when the roll number or inferred year is invalid", () => {
    expect(currentYear("invalid", academicYear)).toBeNull()
    expect(currentYear("2610410001", academicYear)).toBeNull()
    expect(currentYear("27101A0001", academicYear)).toBeNull()
    expect(currentYear("22101A0001", academicYear)).toBeNull()
    expect(currentYear("23101A2000", academicYear)).toBeNull()
  })
})

describe("study year", () => {
  const november = new Date(2026, 10, 11)

  it.each([
    [1, 2026],
    [2, 2025],
    [3, 2024],
    [4, 2023],
  ] as const)("stores year %s as the %s cohort", (year, cohort) => {
    expect(cohortYearFor(year, november)).toBe(cohort)
    expect(studyYear(cohort, november)).toBe(year)
  })

  it("moves a stored cohort up on June 1 and ends after fourth year", () => {
    expect(studyYear(2024, new Date(2027, 4, 31))).toBe(3)
    expect(studyYear(2024, new Date(2027, 5, 1))).toBe(4)
    expect(studyYear(2024, new Date(2028, 5, 1))).toBeNull()
    expect(studyYear(2027, november)).toBeNull()
  })

  it("suggests a year from the roll number, one ahead for DSY", () => {
    expect(rollStudyYear("24102A0054", november)).toBe(3)
    expect(rollStudyYear("25102A2001", november)).toBe(3)
    expect(rollStudyYear("invalid", november)).toBeNull()
  })
})
