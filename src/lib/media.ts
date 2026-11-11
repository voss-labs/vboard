import { z } from "zod"

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const
type ContentType = keyof typeof EXTENSIONS

export const IMAGE_ACCEPT = Object.keys(EXTENSIONS).join(",")

export const MEDIA = {
  logo: { folder: "community-logos", maxMiB: 2, label: "Logo" },
  poster: { folder: "post-posters", maxMiB: 4, label: "Poster" },
} as const
export type MediaKind = keyof typeof MEDIA

export type ImageUpload = {
  body: Uint8Array
  contentType: ContentType
  extension: (typeof EXTENSIONS)[ContentType]
}

const MEDIA_KEY =
  /^(community-logos|post-posters)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/
const STORED_REFERENCE = /^neon:\/\/[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]\/(.+)$/

export function maxMediaBytes(kind: MediaKind) {
  return MEDIA[kind].maxMiB * 1024 * 1024
}

export function mediaSizeError(kind: MediaKind) {
  return `${MEDIA[kind].label} must be ${MEDIA[kind].maxMiB} MiB or smaller.`
}

function imageType(bytes: Uint8Array): ContentType | null {
  const signature = Buffer.from(bytes)
  if (signature.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")))
    return "image/png"
  if (signature.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")))
    return "image/jpeg"
  if (
    signature.length >= 12 &&
    signature.toString("ascii", 0, 4) === "RIFF" &&
    signature.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp"
  return null
}

export async function readImage(
  value: FormDataEntryValue | null,
  kind: MediaKind
) {
  if (
    value === null ||
    (value instanceof File && !value.size && !(value.type in EXTENSIONS))
  )
    return { ok: true as const, data: null }
  const parsed = z
    .instanceof(File, { error: "Choose an image file." })
    .refine((file) => file.size > 0, "Choose a nonempty image.")
    .refine((file) => file.size <= maxMediaBytes(kind), mediaSizeError(kind))
    .refine((file) => file.type in EXTENSIONS, "Use a PNG, JPEG or WebP image.")
    .safeParse(value)
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0].message }
  const body = new Uint8Array(await parsed.data.arrayBuffer())
  const contentType = imageType(body)
  if (!contentType || contentType !== parsed.data.type)
    return {
      ok: false as const,
      error: "The image contents do not match its type.",
    }
  return {
    ok: true as const,
    data: {
      body,
      contentType,
      extension: EXTENSIONS[contentType],
    } satisfies ImageUpload,
  }
}

export function isStoredMedia(value: string | null) {
  return value?.startsWith("neon://") ?? false
}

export function isMediaKey(key: string) {
  return MEDIA_KEY.test(key)
}

export function mediaContentType(key: string) {
  const extension = key.slice(key.lastIndexOf(".") + 1)
  return (
    (Object.keys(EXTENSIONS) as ContentType[]).find(
      (type) => EXTENSIONS[type] === extension
    ) ?? null
  )
}

export function mediaUrl(reference: string | null) {
  if (!reference || !isStoredMedia(reference)) return reference
  const key = STORED_REFERENCE.exec(reference)?.[1]
  return key && isMediaKey(key) ? `/media/${key}` : null
}
