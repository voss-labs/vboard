export type TextSegment = { text: string; href?: string }

const URL_PATTERN = /https?:\/\/[^\s<>"]+/gi
const TRAILING_PUNCTUATION = /[.,;:!?'*_~]$/
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" }

function count(value: string, char: string): number {
  return value.split(char).length - 1
}

function trimUrl(raw: string): string {
  let url = raw
  for (;;) {
    const last = url.at(-1) ?? ""
    const opener = CLOSERS[last]
    const unmatched = opener && count(url, last) > count(url, opener)
    if (!TRAILING_PUNCTUATION.test(url) && !unmatched) return url
    url = url.slice(0, -1)
  }
}

function isWebUrl(value: string): boolean {
  if (!URL.canParse(value)) return false
  const { protocol, hostname } = new URL(value)
  return (protocol === "http:" || protocol === "https:") && hostname !== ""
}

export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0])
    if (!isWebUrl(url)) continue
    if (match.index > cursor)
      segments.push({ text: text.slice(cursor, match.index) })
    segments.push({ text: url, href: url })
    cursor = match.index + url.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
