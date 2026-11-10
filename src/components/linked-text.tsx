import { linkify } from "@/lib/linkify"

export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((segment, index) =>
        segment.href ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-foreground font-medium break-all underline underline-offset-4"
          >
            {segment.text}
          </a>
        ) : (
          segment.text
        )
      )}
    </>
  )
}
