import { describe, expect, it } from "vitest"
import {
  isMediaKey,
  maxMediaBytes,
  mediaContentType,
  mediaUrl,
  readImage,
} from "@/lib/media"

const png = Buffer.from("89504e470d0a1a0a00000000", "hex")

describe("image file boundary", () => {
  it("treats an unselected file field as no upload", async () => {
    expect(await readImage(null, "logo")).toEqual({ ok: true, data: null })
    for (const empty of [
      new File([], ""),
      new File([], "blob", { type: "application/octet-stream" }),
    ])
      expect(await readImage(empty, "logo")).toEqual({ ok: true, data: null })
  })

  it.each([
    [png, "image/png", "png"],
    [Buffer.from("ffd8ffe00000", "hex"), "image/jpeg", "jpg"],
    [Buffer.from("RIFF0000WEBP"), "image/webp", "webp"],
  ])(
    "recognizes %s by bytes and declared type",
    async (bytes, type, extension) => {
      const result = await readImage(
        new File([bytes], "untrusted-name.svg", { type }),
        "logo"
      )
      expect(result).toMatchObject({
        ok: true,
        data: { contentType: type, extension },
      })
    }
  )

  it("rejects disguised HTML and mismatched image signatures", async () => {
    expect(
      (
        await readImage(
          new File(["<html>"], "logo.png", { type: "image/png" }),
          "logo"
        )
      ).ok
    ).toBe(false)
    expect(
      (
        await readImage(
          new File([png], "logo.jpg", { type: "image/jpeg" }),
          "logo"
        )
      ).ok
    ).toBe(false)
  })

  it("rejects SVG, strings and named empty files", async () => {
    for (const value of [
      "forged",
      new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
      new File([], "logo.png", { type: "image/png" }),
    ])
      expect((await readImage(value, "logo")).ok).toBe(false)
  })

  it.each([
    ["logo", "Logo must be 2 MiB or smaller."],
    ["poster", "Poster must be 4 MiB or smaller."],
  ] as const)(
    "accepts a %s at its limit and rejects the next byte before reading the file",
    async (kind, error) => {
      const bytes = new Uint8Array(maxMediaBytes(kind))
      bytes.set(png)
      expect(
        (
          await readImage(
            new File([bytes], "image.png", { type: "image/png" }),
            kind
          )
        ).ok
      ).toBe(true)
      const tooLarge = new File([bytes, "x"], "image.png", {
        type: "image/png",
      })
      tooLarge.arrayBuffer = () => {
        throw new Error("oversized content must not be read")
      }
      expect(await readImage(tooLarge, kind)).toEqual({ ok: false, error })
    }
  )
})

describe("stored media references", () => {
  const community = "c7c1339b-cf14-471a-96e8-82d8f93901df"
  const file = "08116243-476f-425b-b551-c590281474ab"

  it("serves stored logos and posters from the media route", () => {
    for (const key of [
      `community-logos/${community}/${file}.png`,
      `post-posters/${community}/${file}.webp`,
    ]) {
      expect(isMediaKey(key)).toBe(true)
      expect(mediaUrl(`neon://vboard/${key}`)).toBe(`/media/${key}`)
    }
    expect(mediaContentType(`post-posters/${community}/${file}.jpg`)).toBe(
      "image/jpeg"
    )
  })

  it("passes an external address through and keeps nothing as nothing", () => {
    expect(mediaUrl("https://example.org/logo.png")).toBe(
      "https://example.org/logo.png"
    )
    expect(mediaUrl(null)).toBeNull()
  })

  it("fails closed for keys outside the media folders", () => {
    for (const key of [
      "storage-checks/probe.txt",
      `private/${community}/${file}.png`,
      `post-posters/${community}/../${file}.png`,
      `post-posters/${community}/${file}.svg`,
      `post-posters/${community}/${file}.png?token=unexpected`,
    ]) {
      expect(isMediaKey(key)).toBe(false)
      expect(mediaUrl(`neon://vboard/${key}`)).toBeNull()
    }
    expect(mediaContentType("post-posters/file.svg")).toBeNull()
  })
})
