"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withDb } from "@/db"
import { getCommunityBySlug } from "@/db/queries/communities"
import {
  hasPendingCommunityRequest,
  submitCommunityRequest,
  withdrawCommunityRequest,
} from "@/db/queries/community-requests"
import { communityRequestSchema, firstIssue } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { getSessionUser } from "@/lib/session"

function revalidateRequests() {
  revalidatePath("/dashboard/start-community")
  revalidatePath("/dashboard/admin/communities")
}

export async function submitCommunityRequestAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in first.")
  const parsed = communityRequestSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    purpose: formData.get("purpose") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      if (await hasPendingCommunityRequest(ctx))
        return fail("You already have a request waiting for review.")
      if (await getCommunityBySlug(ctx, parsed.data.slug))
        return fail("That address is taken.")
      await submitCommunityRequest(ctx, parsed.data)
      return done("Request sent for review.")
    })
  )
  if (result.ok) revalidateRequests()
  return result
}

export async function withdrawCommunityRequestAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in first.")
  const id = z.uuid().safeParse(formData.get("requestId"))
  if (!id.success) return fail("Unknown request.")
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      await withdrawCommunityRequest(ctx, id.data)
      return done("Request withdrawn.")
    })
  )
  if (result.ok) revalidateRequests()
  return result
}
