"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withDb } from "@/db"
import { updateCommunity } from "@/db/queries/communities"
import { firstIssue, communityFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { actionCommunityAccess } from "@/lib/session"
import { isStoredMedia, readImage } from "@/lib/media"
import { withMediaUpload } from "@/lib/media-upload"
export async function updateCommunityAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(
    formData.get("slug"),
    "community:update"
  )
  if (!access) return fail("You cannot edit this community.")
  const parsed = communityFormSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const removal = z.enum(["on", ""]).safeParse(formData.get("removeLogo") ?? "")
  if (!removal.success) return fail("Choose whether to remove the logo.")
  const image = await readImage(formData.get("logoFile"), "logo")
  if (!image.ok) return fail(image.error)
  if (removal.data === "on" && image.data)
    return fail("Choose an image or remove the logo, then save.")
  const result = await attemptAction(() =>
    withMediaUpload(
      "logo",
      access.community.id,
      image.data,
      async (uploaded) => {
        const logoUrl =
          removal.data === "on"
            ? null
            : (uploaded ??
              parsed.data.logoUrl ??
              (isStoredMedia(access.community.logoUrl)
                ? access.community.logoUrl
                : null))
        await withDb({ userId: access.user.id }, async (ctx) => {
          await updateCommunity(ctx, access.community.id, {
            ...parsed.data,
            logoUrl,
          })
        })
        return done("Community updated.")
      }
    )
  )
  if (result.ok) {
    revalidatePath(`/dashboard/c/${access.community.slug}`, "layout")
    revalidatePath(`/communities/${access.community.slug}`)
    revalidatePath("/communities")
  }
  return result
}
