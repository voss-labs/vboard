"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ImagePlusIcon, Trash2Icon, Undo2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { IMAGE_ACCEPT, MEDIA, maxMediaBytes, mediaSizeError } from "@/lib/media"

export function PosterField({ current }: { current: string | null }) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shown = preview ?? (removed ? null : current)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const choose = (file: File | undefined) => {
    if (file && file.size > maxMediaBytes("poster")) {
      if (input.current) input.current.value = ""
      setError(mediaSizeError("poster"))
      setPreview(null)
      return
    }
    setError(null)
    setPreview(file ? URL.createObjectURL(file) : null)
    if (file) setRemoved(false)
  }
  const clear = () => {
    if (input.current) input.current.value = ""
    setError(null)
    if (preview) setPreview(null)
    else setRemoved(true)
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor="posterFile">Poster</FieldLabel>
      <input type="hidden" name="removePoster" value={removed ? "on" : ""} />
      {shown ? (
        <div className="bg-muted overflow-hidden rounded-lg border">
          <Image
            src={shown}
            alt="Poster preview"
            width={960}
            height={540}
            unoptimized
            className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm transition-colors outline-none focus-visible:ring-3"
        >
          <ImagePlusIcon className="size-5" aria-hidden />
          {removed ? "The poster is removed when you save" : "Add a poster"}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={input}
          id="posterFile"
          name="posterFile"
          type="file"
          accept={IMAGE_ACCEPT}
          aria-invalid={error ? true : undefined}
          aria-describedby="posterFile-help"
          className="min-w-0 flex-1 basis-56"
          onChange={(event) => choose(event.target.files?.[0])}
        />
        {shown && (
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            <Trash2Icon data-icon="inline-start" />
            {preview ? "Discard" : "Remove"}
          </Button>
        )}
        {removed && !preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRemoved(false)}
          >
            <Undo2Icon data-icon="inline-start" />
            Keep poster
          </Button>
        )}
      </div>
      <FieldDescription
        id="posterFile-help"
        className={error ? "text-destructive" : undefined}
        role={error ? "alert" : undefined}
      >
        {error ??
          `PNG, JPEG or WebP, up to ${MEDIA.poster.maxMiB} MiB. Shown on the post page and in the feed.`}
      </FieldDescription>
    </Field>
  )
}
