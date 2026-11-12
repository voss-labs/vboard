import { describe, expect, it } from "vitest"
import {
  canReceiveDecision,
  canSeeLocation,
  initialStatus,
  registrationAvailability,
  seatsLeft,
  type RegistrationWindow,
} from "@/lib/registration"

const now = new Date("2026-10-01T06:00:00Z")

function event(overrides: Partial<RegistrationWindow> = {}) {
  return {
    isEvent: true,
    status: "published",
    startsAt: new Date("2026-10-05T06:00:00Z"),
    endsAt: new Date("2026-10-05T09:00:00Z"),
    registrationOpensAt: null,
    registrationClosesAt: null,
    capacity: null,
    requiresApproval: false,
    ...overrides,
  }
}

describe("registrationAvailability", () => {
  it("refuses a text post", () => {
    expect(registrationAvailability(event({ isEvent: false }), 0, now)).toBe(
      "not_event"
    )
  })

  it("refuses an unpublished event", () => {
    expect(registrationAvailability(event({ status: "draft" }), 0, now)).toBe(
      "unavailable"
    )
  })

  it("is not open before the window opens", () => {
    const opens = new Date("2026-10-02T00:00:00Z")
    expect(
      registrationAvailability(event({ registrationOpensAt: opens }), 0, now)
    ).toBe("not_open")
  })

  it("closes at the close time", () => {
    const closes = new Date("2026-09-30T00:00:00Z")
    expect(
      registrationAvailability(event({ registrationClosesAt: closes }), 0, now)
    ).toBe("closed")
  })

  it("closes once the event has ended when no close time is set", () => {
    expect(
      registrationAvailability(event(), 0, new Date("2026-10-06T00:00:00Z"))
    ).toBe("closed")
  })

  it("is full when every seat is taken", () => {
    expect(registrationAvailability(event({ capacity: 10 }), 10, now)).toBe(
      "full"
    )
  })

  it("stays open for approval events at capacity so requests can queue", () => {
    expect(
      registrationAvailability(
        event({ capacity: 10, requiresApproval: true }),
        10,
        now
      )
    ).toBe("open")
  })

  it("is open otherwise", () => {
    expect(registrationAvailability(event({ capacity: 10 }), 3, now)).toBe(
      "open"
    )
  })
})

describe("initialStatus", () => {
  it("approves straight away without an approval step", () => {
    expect(initialStatus({ requiresApproval: false })).toBe("approved")
  })

  it("queues for approval when required", () => {
    expect(initialStatus({ requiresApproval: true })).toBe("pending")
  })
})

describe("canSeeLocation", () => {
  const gated = { locationVisibility: "after_approval" }

  it("shows a public location to anyone", () => {
    expect(
      canSeeLocation(
        { locationVisibility: "public" },
        { status: null, canManage: false }
      )
    ).toBe(true)
  })

  it("hides a gated location from a pending registrant", () => {
    expect(canSeeLocation(gated, { status: "pending", canManage: false })).toBe(
      false
    )
  })

  it("shows a gated location once approved", () => {
    expect(
      canSeeLocation(gated, { status: "approved", canManage: false })
    ).toBe(true)
  })

  it("shows a gated location to the community team", () => {
    expect(canSeeLocation(gated, { status: null, canManage: true })).toBe(true)
  })
})

describe("seatsLeft", () => {
  it("is unlimited without a capacity", () => {
    expect(seatsLeft(null, 5)).toBeNull()
  })

  it("never goes negative", () => {
    expect(seatsLeft(10, 12)).toBe(0)
  })
})

describe("canReceiveDecision", () => {
  it("lets a decision through only from the statuses it can follow", () => {
    expect(canReceiveDecision("approve", "pending")).toBe(true)
    expect(canReceiveDecision("approve", "rejected")).toBe(true)
    expect(canReceiveDecision("approve", "approved")).toBe(false)
    expect(canReceiveDecision("approve", "cancelled")).toBe(false)
    expect(canReceiveDecision("reject", "approved")).toBe(true)
    expect(canReceiveDecision("reject", "attended")).toBe(false)
    expect(canReceiveDecision("checkin", "approved")).toBe(true)
    expect(canReceiveDecision("checkin", "pending")).toBe(false)
    expect(canReceiveDecision("noshow", "no_show")).toBe(false)
    expect(canReceiveDecision("reset", "attended")).toBe(true)
  })
})
