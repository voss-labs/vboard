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
      <Field>
        <FieldLabel htmlFor="rollNumber">Roll number</FieldLabel>
        <Input
          id="rollNumber"
          name="rollNumber"
          value={rollNumber}
          onChange={(event) => setRollNumber(event.target.value.toUpperCase())}
          onBlur={() => setTouched(true)}
          placeholder="23108A0054"
          maxLength={30}
          required={required}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={showError}
          aria-describedby={showError ? "roll-help roll-error" : "roll-help"}
        />
        <FieldDescription id="roll-help">
          The 10-character number on your VIT ID card. It fills in your
          department and division.
        </FieldDescription>
        {showError && (
          <p id="roll-error" role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </Field>
      {parsed?.department && (
        <dl
          aria-live="polite"
          className="bg-muted/50 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border px-3 py-3 text-sm"
        >
          <div className="text-muted-foreground col-span-full flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="text-success size-3.5" aria-hidden />
            From your roll number
            {parsed.isDSY && " · direct second-year admission"}
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Department</dt>
            <dd className="font-medium">
              {DEPARTMENT_LABELS[parsed.department]}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Division</dt>
            <dd className="font-medium">{parsed.division}</dd>
          </div>
        </dl>
      )}
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
              ? "Filled from your roll number. Change it if it is wrong; it moves up each June."
              : "It moves up by itself each June."}
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="bio">
          Bio
          <span className="text-muted-foreground text-xs font-normal">
            Optional
          </span>
        </FieldLabel>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialBio ?? ""}
          placeholder="A line about you: what you build, what you want to try"
          maxLength={400}
        />
        <FieldDescription>
          Organizers see it next to your registration.
        </FieldDescription>
      </Field>
      {footer(valid)}
    </FieldGroup>
  )
}
