"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { FormSelect } from "@/components/form-select"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { academicDay } from "@/lib/profile"
import {
  DEPARTMENT_LABELS,
  parseRollNumber,
  rollStudyYear,
  STUDY_YEARS,
  STUDY_YEAR_LABELS,
  type StudyYear,
} from "@/lib/roll-number"

const UNSET = ""

function readRollNumber(value: string) {
  if (!value.trim()) return { parsed: null, error: null }
  const parsed = parseRollNumber(value)
  if (!parsed)
    return {
      parsed: null,
      error: "Enter a valid VIT roll number, for example 23108A0054.",
    }
  if (!parsed.department)
    return {
      parsed: null,
      error: "Use a roll number for Bio-med, EXCS, EXTC, CMPN or IT.",
    }
  return { parsed, error: null }
}

export function ProfileFields({
  initialRollNumber,
  initialYear,
  initialBio,
  academicDate,
  required,
  footer,
}: {
  initialRollNumber: string | null
  initialYear: StudyYear | null
  initialBio: string | null
  academicDate: string
  required: boolean
  footer: (valid: boolean) => React.ReactNode
}) {
  const [rollNumber, setRollNumber] = useState(initialRollNumber ?? "")
  const [touched, setTouched] = useState(Boolean(initialRollNumber))
  const [bio, setBio] = useState(initialBio ?? "")
  const [picked, setPicked] = useState<string | null>(
    initialYear ? String(initialYear) : null
  )
  const { parsed, error } = readRollNumber(rollNumber)
  const derivedYear = parsed
    ? rollStudyYear(rollNumber, academicDay(academicDate))
    : null
  const year = picked ?? (derivedYear ? String(derivedYear) : UNSET)
  const showError = Boolean(
    error && (touched || rollNumber.trim().length >= 10)
  )
  const valid = !error && (!required || (Boolean(parsed) && year !== UNSET))

  return (
    <FieldGroup>
      <div className="grid gap-5 @md/field-group:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="rollNumber">Roll number</FieldLabel>
          <Input
            id="rollNumber"
            name="rollNumber"
            value={rollNumber}
            onChange={(event) =>
              setRollNumber(event.target.value.toUpperCase())
            }
            onBlur={() => setTouched(true)}
            placeholder="23108A0054"
            maxLength={30}
            required={required}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="tabular-nums"
            aria-invalid={showError}
            aria-describedby="roll-help"
          />
          {showError ? (
            <p id="roll-help" role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : parsed?.department ? (
            <p
              id="roll-help"
              aria-live="polite"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm"
            >
              <CheckCircle2
                className="text-success size-4 shrink-0"
                aria-hidden
              />
              <span className="font-medium">
                {DEPARTMENT_LABELS[parsed.department]} · Division{" "}
                {parsed.division}
              </span>
              {parsed.isDSY && (
                <span className="text-muted-foreground">
                  · direct second-year admission
                </span>
              )}
            </p>
          ) : (
            <FieldDescription id="roll-help">
              The 10-character number on your VIT ID card.
            </FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="year">Year</FieldLabel>
          <FormSelect
            key={year}
            id="year"
            name="year"
            label="Year"
            defaultValue={year}
            disabled={!parsed}
            onValueChange={setPicked}
            items={[
              { value: UNSET, label: "Select your year" },
              ...STUDY_YEARS.map((option) => ({
                value: String(option),
                label: STUDY_YEAR_LABELS[option],
              })),
            ]}
          />
          <FieldDescription>
            {!parsed
              ? "Enter your roll number first."
              : derivedYear && year === String(derivedYear)
                ? "Filled from your roll number. Moves up each June."
                : "Moves up each June."}
          </FieldDescription>
        </Field>
      </div>
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor="bio">
            Bio
            <span className="text-muted-foreground text-xs font-normal">
              Optional
            </span>
          </FieldLabel>
          <span className="text-muted-foreground text-xs tabular-nums">
            {bio.length}/400
          </span>
        </div>
        <Textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="A line about you: what you build, what you want to try"
          maxLength={400}
        />
      </Field>
      {footer(valid)}
    </FieldGroup>
  )
}
