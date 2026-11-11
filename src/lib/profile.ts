import { campusDayKey } from "@/lib/format"
import {
  parseRollNumber,
  studyYear,
  STUDY_YEAR_LABELS,
} from "@/lib/roll-number"

export type ProfileDetails = {
  rollNumber: string | null
  department: string | null
  cohortYear: number | null
}

export function isProfileComplete(profile: ProfileDetails): boolean {
  return Boolean(
    profile.rollNumber &&
    profile.department &&
    profile.cohortYear !== null &&
    parseRollNumber(profile.rollNumber)?.department
  )
}

export function academicDate(now: Date = new Date()): string {
  return campusDayKey(now)
}

export function academicDay(date: string): Date {
  return new Date(`${date}T12:00:00`)
}

export function onboardingPath(next: string): string {
  return `/onboarding?next=${encodeURIComponent(next)}`
}

export function studyYearLabel(
  cohortYear: number | null,
  on: Date = academicDay(academicDate())
): string | null {
  const year = cohortYear === null ? null : studyYear(cohortYear, on)
  return year ? STUDY_YEAR_LABELS[year] : null
}

export function divisionOf(rollNumber: string | null): string | null {
  return rollNumber ? (parseRollNumber(rollNumber)?.division ?? null) : null
}
