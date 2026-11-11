import type { PostCardPost } from "@/components/post-card"

export type CalendarEvent = PostCardPost

export function toCalendarEvent(post: PostCardPost): CalendarEvent {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    body: post.body,
    imageUrl: post.imageUrl,
    communitySlug: post.communitySlug,
    communityName: post.communityName,
    isEvent: post.isEvent,
    isPinned: post.isPinned,
    startsAt: post.startsAt,
    endsAt: post.endsAt,
    location:
      post.locationVisibility === "after_approval" ? null : post.location,
    locationVisibility: post.locationVisibility,
    capacity: post.capacity,
    seatsTaken: post.seatsTaken,
    requiresApproval: post.requiresApproval,
  }
}
