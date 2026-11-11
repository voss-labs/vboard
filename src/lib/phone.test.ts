import { describe, expect, it } from "vitest"
import { formatPhone, isPhone, normalizePhone, phoneSchema } from "@/lib/phone"

describe("normalizePhone", () => {
  it("keeps a bare ten-digit mobile number", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210")
  })

  it("drops spacing, punctuation and the country or trunk prefix", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210")
    expect(normalizePhone("91-98765-43210")).toBe("9876543210")
    expect(normalizePhone("098765 43210")).toBe("9876543210")
    expect(normalizePhone("(98765) 43210")).toBe("9876543210")
  })

  it("leaves a number that starts with 91 and is already ten digits", () => {
    expect(normalizePhone("9198765432")).toBe("9198765432")
  })
})

describe("phoneSchema", () => {
  it("accepts mobile numbers in common spellings", () => {
    expect(phoneSchema.parse("+91 98765 43210")).toBe("9876543210")
  })

  it("rejects landlines, short numbers and text", () => {
    for (const value of ["", "12345", "5876543210", "98765432101", "call me"])
      expect(phoneSchema.safeParse(value).success).toBe(false)
  })
})

describe("formatPhone", () => {
  it("groups a stored number for reading", () => {
    expect(formatPhone("9876543210")).toBe("+91 98765 43210")
    expect(isPhone("9876543210")).toBe(true)
  })

  it("returns anything else unchanged", () => {
    expect(formatPhone("12345")).toBe("12345")
  })
})
