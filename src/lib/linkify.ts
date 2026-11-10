export type TextSegment = { text: string; href?: string }

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi
const TRAILING_PUNCTUATION = /[.,;:!?'"*_~]+$/

function trimUrl(candidate: string): string {
  let url = candidate.replace(TRAILING_PUNCTUATION, "")
  for (const [open, close] of ["()", "[]", "{}"]) {
    while (
      url.endsWith(close) &&
      url.split(close).length > url.split(open).length
    ) {
      url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, "")
    }
  }
  return url
}

function toHref(url: string): string | null {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    const parsed = new URL(href)
    return parsed.hostname.includes(".") ? href : null
  } catch {
    return null
  }
}

export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0])
    const href = toHref(url)
    if (!href) continue
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index) })
    }
    segments.push({ text: url, href })
    cursor = match.index + url.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
