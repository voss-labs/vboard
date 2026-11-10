import { linkify } from "@/lib/linkify"

export function LinkedText({ text }: { text: string }) {
  return linkify(text).map((segment, index) =>
    segment.href ? (
      <a
        key={index}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-primary break-all underline underline-offset-4 hover:no-underline"
      >
        {segment.text}
      </a>
    ) : (
      segment.text
    )
  )
}
