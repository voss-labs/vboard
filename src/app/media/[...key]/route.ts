import { isMediaKey, mediaContentType } from "@/lib/media"
import { readMedia } from "@/lib/object-storage"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const key = (await params).key.join("/")
  const contentType = mediaContentType(key)
  const body = isMediaKey(key) && contentType ? await readMedia(key) : null
  if (!body || !contentType) return new Response(null, { status: 404 })
  return new Response(Buffer.from(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  })
}
