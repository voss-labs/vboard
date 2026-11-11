import "server-only"
import type { ImageUpload, MediaKind } from "@/lib/media"
import { discardMedia, uploadMedia } from "@/lib/object-storage"

export async function withMediaUpload<T extends { ok: boolean }>(
  kind: MediaKind,
  communityId: string,
  image: ImageUpload | null,
  save: (reference: string | null) => Promise<T>
) {
  const uploaded = image ? await uploadMedia(kind, communityId, image) : null
  let saved: T | undefined
  try {
    saved = await save(uploaded?.reference ?? null)
    return saved
  } finally {
    if (uploaded && !saved?.ok)
      await discardMedia(uploaded.key).catch(() =>
        console.error(
          JSON.stringify({
            event: "media_cleanup_failed",
            kind,
            communityId,
            severity: "error",
            timestamp: new Date().toISOString(),
          })
        )
      )
  }
}
