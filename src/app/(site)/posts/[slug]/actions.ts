"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withDb } from "@/db"
import {
  cancelRegistration,
  getEventQuestions,
  registerForEvent,
} from "@/db/queries/registrations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { isProfileComplete } from "@/lib/profile"
import { validateAnswers } from "@/lib/registration-form"
import { getSessionUser } from "@/lib/session"
const input = z.object({ postId: z.uuid() }).strict()
function revalidate() {
  revalidatePath("/posts", "layout")
  revalidatePath("/dashboard", "layout")
  revalidatePath("/")
}
export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in to register.")
  if (!isProfileComplete(user))
    return fail("Finish your profile before you register.")
  const parsed = input.safeParse({ postId: formData.get("postId") })
  if (!parsed.success) return fail("Unknown event.")
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      const questions = await getEventQuestions(ctx, parsed.data.postId)
      const checked = validateAnswers(questions, (id) =>
        formData.get(`answer.${id}`)
      )
      if (!checked.ok) return fail(checked.error)
      const registration = await registerForEvent(
        ctx,
        parsed.data.postId,
        checked.answers
      )
      return done(
        registration.status === "pending"
          ? "Request sent. You will see the decision here."
          : "You are registered."
      )
    })
  )
  if (result.ok) revalidate()
  return result
}
export async function cancelRegistrationAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in first.")
  const parsed = input.safeParse({ postId: formData.get("postId") })
  if (!parsed.success) return fail("Unknown event.")
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      await cancelRegistration(ctx, parsed.data.postId)
      return done("Registration cancelled.")
    })
  )
  if (result.ok) revalidate()
  return result
}
