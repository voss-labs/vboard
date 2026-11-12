export const DEPARTMENTS = ["BIOMED", "EXCS", "EXTC", "CMPN", "IT"] as const

export type Department = (typeof DEPARTMENTS)[number]

export const DEPARTMENT_LABELS: Record<Department, string> = {
  BIOMED: "Bio-med",
  EXCS: "EXCS",
  EXTC: "EXTC",
  CMPN: "CMPN",
  IT: "IT",
}

const BRANCH_DEPARTMENTS: Record<string, Department | undefined> = {
  "101": "IT",
  "102": "CMPN",
  "103": "EXCS",
  "104": "EXTC",
  "105": "BIOMED",
  "108": "EXCS",
}

const YEARS = ["FE", "SE", "TE", "BE"] as const

type Year = (typeof YEARS)[number]

type ParsedRollNumber = {
  admissionYear: number
  branchCode: string
  department: Department | null
  division: "A" | "B" | "C"
  classNumber: number
  isDSY: boolean
}

export function parseRollNumber(raw: string): ParsedRollNumber | null {
  const match = /^(\d{2})(\d{3})([A-C])(\d{4})$/.exec(raw.trim().toUpperCase())
  if (!match) return null

  const [, year, branchCode, division, classDigits] = match
  const department = BRANCH_DEPARTMENTS[branchCode] ?? null
  const classNumber = Number(classDigits)
  return {
    admissionYear: 2000 + Number(year),
    branchCode,
    department,
    division: division as ParsedRollNumber["division"],
    classNumber,
    isDSY: classNumber >= 2000,
  }
}

export const STUDY_YEARS = [1, 2, 3, 4] as const

export type StudyYear = (typeof STUDY_YEARS)[number]

export const STUDY_YEAR_LABELS: Record<StudyYear, string> = {
  1: "First year",
  2: "Second year",
  3: "Third year",
  4: "Fourth year",
}

function academicStart(on: Date): number {
  return on.getFullYear() - (on.getMonth() < 5 ? 1 : 0)
}

export function expectedYear(admissionYear: number, on: Date): Year | null {
  return YEARS[academicStart(on) - admissionYear] ?? null
}

export function cohortYearFor(year: StudyYear, on: Date): number {
  return academicStart(on) - (year - 1)
}

export function studyYear(cohortYear: number, on: Date): StudyYear | null {
  const year = academicStart(on) - cohortYear + 1
  return STUDY_YEARS.find((candidate) => candidate === year) ?? null
}

export function rollStudyYear(rollNumber: string, on: Date): StudyYear | null {
  const year = currentYear(rollNumber, on)
  return year ? STUDY_YEARS[YEARS.indexOf(year)] : null
}

export function currentYear(
  rollNumber: string,
  on: Date = new Date()
): Year | null {
  const parsed = parseRollNumber(rollNumber)
  if (!parsed) return null

  return expectedYear(parsed.admissionYear - (parsed.isDSY ? 1 : 0), on)
}
