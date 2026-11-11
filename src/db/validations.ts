import { z } from "zod"
import { createInsertSchema } from "drizzle-zod"
import { community, communityMember, post, profile } from "@/db/schema"
import { parseCampusDateTime } from "@/lib/format"
import { questionsSchema } from "@/lib/registration-form"
import { parseRollNumber, STUDY_YEARS } from "@/lib/roll-number"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))

const campusDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null
    const date = parseCampusDateTime(v)
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time" })
      return z.NEVER
    }
    return date
  })

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true")

const questionsField = z
  .string()
  .transform((v, ctx) => {
    try {
      return JSON.parse(v || "[]") as unknown
    } catch {
      ctx.addIssue({ code: "custom", message: "Check the questions" })
      return z.NEVER
    }
  })
  .pipe(questionsSchema)

export const postFormSchema = createInsertSchema(post)
  .pick({
    title: true,
    body: true,
    visibility: true,
    isPinned: true,
    isEvent: true,
    startsAt: true,
    endsAt: true,
    location: true,
    locationVisibility: true,
    registrationOpensAt: true,
    registrationClosesAt: true,
    capacity: true,
    requiresApproval: true,
    registrationQuestions: true,
  })
  .extend({
    title: z.string().trim().min(3, "Title is too short").max(140),
    body: z.string().trim().min(1, "Write something").max(10000),
    visibility: z.enum(["public", "vit_only"]),
    isPinned: checkbox,
    isEvent: checkbox,
    startsAt: campusDate,
    endsAt: campusDate,
    location: optionalText(200),
    locationVisibility: z.enum(["public", "after_approval"]),
    registrationOpensAt: campusDate,
    registrationClosesAt: campusDate,
    capacity: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null
        const n = Number(v)
        if (!Number.isInteger(n) || n < 1 || n > 100000) {
          ctx.addIssue({
            code: "custom",
            message: "Capacity must be a whole number",
          })
          return z.NEVER
        }
        return n
      }),
    requiresApproval: checkbox,
    registrationQuestions: questionsField,
    intent: z.enum(["draft", "publish", "save"]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.isEvent) return
    if (!v.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Events need a start time",
      })
    if (!v.endsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Events need an end time",
      })
    if (v.startsAt && v.endsAt && v.endsAt <= v.startsAt)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after the start",
      })
    if (
      v.registrationOpensAt &&
      v.registrationClosesAt &&
      v.registrationClosesAt <= v.registrationOpensAt
    )
      ctx.addIssue({
        code: "custom",
        path: ["registrationClosesAt"],
        message: "Registration must close after it opens",
      })
  })
  .transform((v) => ({
    title: v.title,
    body: v.body,
    visibility: v.visibility,
    isPinned: v.isPinned,
    isEvent: v.isEvent,
    startsAt: v.isEvent ? v.startsAt : null,
    endsAt: v.isEvent ? v.endsAt : null,
    location: v.isEvent ? v.location : null,
    locationVisibility: v.isEvent ? v.locationVisibility : null,
    registrationOpensAt: v.isEvent ? v.registrationOpensAt : null,
    registrationClosesAt: v.isEvent ? v.registrationClosesAt : null,
    capacity: v.isEvent ? v.capacity : null,
    requiresApproval: v.isEvent ? v.requiresApproval : false,
    registrationQuestions: v.isEvent ? v.registrationQuestions : [],
    intent: v.intent,
  }))

export const communityFormSchema = createInsertSchema(community)
  .pick({ name: true, description: true, logoUrl: true })
  .extend({
    name: z.string().trim().min(2, "Name is too short").max(80),
    description: z.string().trim().max(600),
    logoUrl: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(
        z
          .url({
            protocol: /^https?$/,
            error: "Logo must be an HTTP or HTTPS URL",
          })
          .nullable()
      ),
  })
  .strict()

export const newCommunitySchema = createInsertSchema(community)
  .pick({ name: true, slug: true, description: true })
  .extend({
    name: z.string().trim().min(2, "Name is too short").max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers and hyphens"
      )
      .max(60),
    description: z.string().trim().max(600),
    leadEmail: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.toLowerCase()))
      .pipe(z.email("Enter a valid email").nullable()),
  })
  .strict()

export const communityRequestSchema = newCommunitySchema
  .omit({ leadEmail: true })
  .extend({
    purpose: z
      .string()
      .trim()
      .min(20, "Say a little more about what the community will do")
      .max(600),
  })
  .strict()

export const memberFormSchema = createInsertSchema(communityMember)
  .pick({ role: true })
  .extend({
    email: z
      .email("Enter a valid email")
      .transform((v) => v.trim().toLowerCase()),
    role: createInsertSchema(communityMember).shape.role.unwrap(),
  })
  .strict()

const profileFields = createInsertSchema(profile)
  .pick({ rollNumber: true, bio: true })
  .extend({
    rollNumber: optionalText(30).transform((value, ctx) => {
      if (!value) return null
      try {
        const parsed = parseRollNumber(value)
        if (!parsed)
          throw new Error(
            "Enter a valid VIT roll number, for example 23108A0054."
          )
        if (!parsed.department)
          throw new Error(
            "Use a roll number for Bio-med, EXCS, EXTC, CMPN or IT."
          )
        return value.toUpperCase()
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message:
            error instanceof Error
              ? error.message
              : "Enter a valid roll number.",
        })
        return z.NEVER
      }
    }),
    year: z
      .string()
      .trim()
      .transform((value, ctx) => {
        if (value === "") return null
        const year = STUDY_YEARS.find((option) => String(option) === value)
        if (!year) {
          ctx.addIssue({ code: "custom", message: "Choose your year." })
          return z.NEVER
        }
        return year
      }),
    bio: optionalText(400),
  })
  .strict()

function withDepartment(data: z.infer<typeof profileFields>) {
  return {
    ...data,
    year: data.rollNumber ? data.year : null,
    department: data.rollNumber
      ? (parseRollNumber(data.rollNumber)?.department ?? null)
      : null,
  }
}

export const profileFormSchema = profileFields.transform(withDepartment)

export const onboardingFormSchema = profileFields
  .superRefine((data, ctx) => {
    if (!data.rollNumber)
      ctx.addIssue({ code: "custom", message: "Enter your roll number." })
    else if (!data.year)
      ctx.addIssue({ code: "custom", message: "Choose your year." })
  })
  .transform(withDepartment)

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again"
}
