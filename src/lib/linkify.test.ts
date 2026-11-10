import { describe, expect, it } from "vitest"
import { linkify } from "@/lib/linkify"

describe("linkify", () => {
  it("returns plain text untouched", () => {
    expect(linkify("No links here.")).toEqual([{ text: "No links here." }])
  })

  it("returns nothing for empty text", () => {
    expect(linkify("")).toEqual([])
  })

  it("links a url that follows a line break", () => {
    const url = "https://chat.whatsapp.com/Ks27uu3EvF53Lcl89nF9FK?mode=gi_t"
    expect(linkify(`Join the group:\n${url}\n\nNo prep needed.`)).toEqual([
      { text: "Join the group:\n" },
      { text: url, href: url },
      { text: "\n\nNo prep needed." },
    ])
  })

  it("leaves sentence punctuation outside the link", () => {
    expect(linkify("See https://vosslabs.org/apply, then reply.")).toEqual([
      { text: "See " },
      {
        text: "https://vosslabs.org/apply",
        href: "https://vosslabs.org/apply",
      },
      { text: ", then reply." },
    ])
  })

  it("drops a wrapping bracket but keeps balanced ones", () => {
    expect(linkify("(https://example.com/a)")).toEqual([
      { text: "(" },
      { text: "https://example.com/a", href: "https://example.com/a" },
      { text: ")" },
    ])
    expect(linkify("https://en.wikipedia.org/wiki/Mumbai_(city)")[0]).toEqual({
      text: "https://en.wikipedia.org/wiki/Mumbai_(city)",
      href: "https://en.wikipedia.org/wiki/Mumbai_(city)",
    })
  })

  it("adds https to bare www links", () => {
    expect(linkify("www.vit.edu.in")).toEqual([
      { text: "www.vit.edu.in", href: "https://www.vit.edu.in" },
    ])
  })

  it("links several urls in one text", () => {
    const links = linkify("http://a.example and https://b.example/x").filter(
      (segment) => segment.href
    )
    expect(links.map((segment) => segment.href)).toEqual([
      "http://a.example",
      "https://b.example/x",
    ])
  })

  it("never links other schemes or malformed urls", () => {
    for (const text of [
      "javascript:alert(1)",
      "mailto:a@b.co",
      "https://",
      "www.",
    ]) {
      expect(linkify(text)).toEqual([{ text }])
    }
  })
})
