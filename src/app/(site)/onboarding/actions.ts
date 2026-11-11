"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { withDb } from "@/db"
import { updateProfile } from "@/db/queries/profiles"
import { firstIssue, onboardingFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { safeReturnPath } from "@/lib/auth-redirect"
import { academicDate, academicDay } from "@/lib/profile"
import { cohortYearFor } from "@/lib/roll-number"
import { getSessionUser } from "@/lib/session"
export async function completeOnboardingAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in first.")
  const parsed = onboardingFormSchema.safeParse({
    rollNumber: formData.get("rollNumber") ?? "",
    year: formData.get("year") ?? "",
    phone: formData.get("phone") ?? "",
    bio: formData.get("bio") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { year, ...details } = parsed.data
  if (!year) return fail("Choose your year.")
  const cohortYear = cohortYearFor(year, academicDay(academicDate()))
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      await updateProfile(ctx, { ...details, cohortYear })
      return done()
    })
  )
  if (!result.ok) return result
  revalidatePath("/dashboard", "layout")
  revalidatePath("/posts", "layout")
  redirect(safeReturnPath(formData.get("next")))
}
