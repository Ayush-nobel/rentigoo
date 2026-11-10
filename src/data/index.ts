import { occupiedDates } from '@shared/pricing'
import type { Booking, Conversation, Listing, Message, Review, UserProfile } from '@shared/types'
import { BOOKINGS, CONVERSATIONS, MESSAGES } from './activity'
import { LISTINGS } from './listings'
import { REVIEWS } from './reviews'
import { USERS } from './users'

export interface Snapshot {
  users: UserProfile[]
  listings: Listing[]
  bookings: Booking[]
  reviews: Review[]
  conversations: Conversation[]
  messages: Message[]
}

/** Dates an accepted or in-progress booking takes off the calendar. */
export const BLOCKING_STATUSES: Booking['status'][] = ['accepted', 'active']

/** Recompute derived fields (ratings, review targets, booked dates) from raw rows. */
export function deriveSnapshot(raw: Snapshot): Snapshot {
  const snap: Snapshot = structuredClone(raw)
  const listingById = new Map(snap.listings.map((l) => [l.id, l]))

  for (const r of snap.reviews) {
    if (!r.targetUserId) r.targetUserId = listingById.get(r.listingId)?.ownerId ?? ''
  }

  for (const l of snap.listings) {
    const rs = snap.reviews.filter((r) => r.listingId === l.id && r.role === 'renter')
    l.ratingCount = rs.length
    l.ratingAvg = rs.length ? round1(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0
    const booked = snap.bookings
      .filter((b) => b.listingId === l.id && BLOCKING_STATUSES.includes(b.status))
      .flatMap((b) => occupiedDates(b.start, b.end))
    l.blockedDates = [...new Set([...l.blockedDates, ...booked])].sort()
  }

  for (const u of snap.users) {
    const rs = snap.reviews.filter((r) => r.targetUserId === u.id)
    u.ratingCount = rs.length
    u.ratingAvg = rs.length ? round1(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0
  }

  return snap
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function seedSnapshot(): Snapshot {
  return deriveSnapshot({
    users: USERS,
    listings: LISTINGS,
    bookings: BOOKINGS,
    reviews: REVIEWS,
    conversations: CONVERSATIONS,
    messages: MESSAGES,
  })
}
