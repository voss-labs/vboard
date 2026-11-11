import "server-only"
import { randomUUID } from "node:crypto"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { z } from "zod"
import { MEDIA, type ImageUpload, type MediaKind } from "@/lib/media"

const storageSchema = z.object({
  endpoint: z.url().refine((value) => {
    if (!URL.canParse(value)) return false
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
  }),
  region: z.string().min(1),
  bucket: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
})

function storageConfig() {
  return storageSchema.parse({
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION,
    bucket: process.env.NEON_STORAGE_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
}

function storageClient(config: ReturnType<typeof storageConfig>) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  })
}

async function send<T>(work: (client: S3Client, bucket: string) => Promise<T>) {
  const config = storageConfig()
  const client = storageClient(config)
  try {
    return await work(client, config.bucket)
  } finally {
    client.destroy()
  }
}

const within = () => ({ abortSignal: AbortSignal.timeout(15_000) })

export async function uploadMedia(
  kind: MediaKind,
  communityId: string,
  image: ImageUpload
) {
  const key = `${MEDIA[kind].folder}/${communityId}/${randomUUID()}.${image.extension}`
  return send(async (client, bucket) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: image.body,
        ContentType: image.contentType,
        ContentLength: image.body.byteLength,
        CacheControl: "public, max-age=31536000, immutable",
      }),
      within()
    )
    return { key, reference: `neon://${bucket}/${key}` }
  })
}

export async function discardMedia(key: string) {
  await send((client, bucket) =>
    client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), within())
  )
}

export async function readMedia(key: string) {
  return send(async (client, bucket) => {
    try {
      const object = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        within()
      )
      return (await object.Body?.transformToByteArray()) ?? null
    } catch (error) {
      if (error instanceof NoSuchKey) return null
      throw error
    }
  })
}
