export type RegistrationStatus =
  "pending" | "approved" | "rejected" | "cancelled" | "attended" | "no_show"

export type RegistrationWindow = {
  isEvent: boolean
  status: string
  startsAt: Date | null
  endsAt: Date | null
  registrationOpensAt: Date | null
  registrationClosesAt: Date | null
  capacity: number | null
  requiresApproval: boolean
}

export type RegistrationAvailability =
  "not_event" | "unavailable" | "not_open" | "closed" | "full" | "open"

export const ACTIVE_STATUSES: RegistrationStatus[] = [
  "pending",
  "approved",
  "attended",
]

export const SEAT_STATUSES: RegistrationStatus[] = ["approved", "attended"]

export function isActiveRegistration(status: RegistrationStatus): boolean {
  return ACTIVE_STATUSES.includes(status)
}

export function registrationAvailability(
  post: RegistrationWindow,
  seatsTaken: number,
  now: Date = new Date()
): RegistrationAvailability {
  if (!post.isEvent) return "not_event"
  if (post.status !== "published") return "unavailable"
  if (post.registrationOpensAt && now < post.registrationOpensAt)
    return "not_open"
  const closesAt = post.registrationClosesAt ?? post.endsAt ?? post.startsAt
  if (closesAt && now > closesAt) return "closed"
  if (
    !post.requiresApproval &&
    post.capacity !== null &&
    seatsTaken >= post.capacity
  )
    return "full"
  return "open"
}

export function canRegisterNow(
  status: RegistrationStatus | null,
  availability: RegistrationAvailability
): boolean {
  const active =
    status === "pending" || status === "approved" || status === "attended"
  return !active && status !== "rejected" && availability === "open"
}

export function initialStatus(
  post: Pick<RegistrationWindow, "requiresApproval">
): RegistrationStatus {
  return post.requiresApproval ? "pending" : "approved"
}

export function canSeeLocation(
  post: { locationVisibility: string | null },
  viewer: { status: RegistrationStatus | null; canManage: boolean }
): boolean {
  if (post.locationVisibility !== "after_approval") return true
  if (viewer.canManage) return true
  return viewer.status === "approved" || viewer.status === "attended"
}

export function seatsLeft(
  capacity: number | null,
  seatsTaken: number
): number | null {
  if (capacity === null) return null
  return Math.max(0, capacity - seatsTaken)
}
