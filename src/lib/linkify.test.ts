import { describe, expect, it } from "vitest"
import { linkify } from "@/lib/linkify"

describe("linkify", () => {
  it("returns plain text untouched", () => {
    expect(linkify("No links here.")).toEqual([{ text: "No links here." }])
  })

  it("returns nothing for empty text", () => {
    expect(linkify("")).toEqual([])
  })

  it("links a URL and keeps the surrounding text and line breaks", () => {
    const url = "https://chat.whatsapp.com/Ks27uu3EvF53Lcl89nF9FK?mode=gi_t"
    expect(
      linkify(`Join the group:\n${url}\n\nNo preparation needed.`)
    ).toEqual([
      { text: "Join the group:\n" },
      { text: url, href: url },
      { text: "\n\nNo preparation needed." },
    ])
  })

  it("leaves sentence punctuation outside the link", () => {
    expect(linkify("Read https://vosslabs.org/about, then apply.")).toEqual([
      { text: "Read " },
      {
        text: "https://vosslabs.org/about",
        href: "https://vosslabs.org/about",
      },
      { text: ", then apply." },
    ])
    expect(linkify("(see https://vosslabs.org).")).toEqual([
      { text: "(see " },
      { text: "https://vosslabs.org", href: "https://vosslabs.org" },
      { text: ")." },
    ])
  })

  it("keeps brackets that belong to the URL", () => {
    const url = "https://en.wikipedia.org/wiki/Rust_(programming_language)"
    expect(linkify(`${url} is worth reading`)).toEqual([
      { text: url, href: url },
      { text: " is worth reading" },
    ])
  })

  it("links several URLs", () => {
    expect(
      linkify("http://a.example and https://b.example/x").filter((s) => s.href)
    ).toEqual([
      { text: "http://a.example", href: "http://a.example" },
      { text: "https://b.example/x", href: "https://b.example/x" },
    ])
  })

  it("never links other schemes or bare text", () => {
    for (const text of [
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "mailto:someone@vit.edu.in",
      "vosslabs.org",
      "https://",
    ])
      expect(linkify(text)).toEqual([{ text }])
  })
})
