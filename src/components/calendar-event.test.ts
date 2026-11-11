import { describe, expect, it } from "vitest"
import { toCalendarEvent } from "@/components/calendar-event"
import type { PostCardPost } from "@/components/post-card"

const event: PostCardPost = {
  id: "event-id",
  slug: "campus-event",
  title: "Campus event",
  body: "Event information",
  imageUrl: null,
  communitySlug: "community",
  communityName: "Community",
  isEvent: true,
  isPinned: false,
  startsAt: new Date("2026-10-19T04:30:00Z"),
  endsAt: new Date("2026-10-19T06:30:00Z"),
  location: "Private venue address",
  locationVisibility: "after_approval",
  capacity: 30,
  seatsTaken: 2,
  requiresApproval: true,
}

describe("calendar event presentation boundary", () => {
  it("removes approval-gated addresses and unrelated fields before serialization", () => {
    const record = {
      ...event,
      advisorApprovedBy: "private-user-id",
      registrationOpensAt: new Date(),
    }
    const result = toCalendarEvent(record)
    const serialized = JSON.stringify(result)

    expect(result.location).toBeNull()
    expect(result.locationVisibility).toBe("after_approval")
    expect(serialized).not.toContain("Private venue address")
    expect(serialized).not.toContain("private-user-id")
    expect(result).not.toHaveProperty("registrationOpensAt")
    expect(result.title).toBe(event.title)
    expect(result.startsAt).toEqual(event.startsAt)
    expect(record.location).toBe("Private venue address")
  })

  it("retains public locations", () => {
    expect(
      toCalendarEvent({ ...event, locationVisibility: "public" }).location
    ).toBe(event.location)
  })
})
