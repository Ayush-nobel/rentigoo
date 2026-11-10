import type { Review } from '../../../shared/types'
import type { Store, StoredBooking, StoredListing } from './bookings'

/** In-memory Store for tests. */
export function memoryStore(seed: { listings?: StoredListing[]; bookings?: StoredBooking[]; reviews?: Review[] } = {}) {
  const listings = new Map((seed.listings ?? []).map((l) => [l.id, structuredClone(l)]))
  const bookings = new Map((seed.bookings ?? []).map((b) => [b.id, structuredClone(b)]))
  const reviews: Review[] = structuredClone(seed.reviews ?? [])
  const userRatings = new Map<string, { avg: number; count: number }>()
  let n = 0

  const store: Store = {
    async getListing(id) {
      return structuredClone(listings.get(id) ?? null)
    },
    async setListingBookedDates(id, dates) {
      listings.get(id)!.bookedDates = dates
    },
    async setListingRating(id, avg, count) {
      Object.assign(listings.get(id)!, { ratingAvg: avg, ratingCount: count })
    },
    async getBooking(id) {
      return structuredClone(bookings.get(id) ?? null)
    },
    async listBookingsForListing(listingId) {
      return [...bookings.values()].filter((b) => b.listingId === listingId).map((b) => structuredClone(b))
    },
    async listBookingsForOwner(ownerId) {
      return [...bookings.values()].filter((b) => b.ownerId === ownerId).map((b) => structuredClone(b))
    },
    async createBooking(b) {
      const created = { ...b, id: `b${++n}`, createdAt: new Date().toISOString() }
      bookings.set(created.id, created)
      return structuredClone(created)
    },
    async setBookingStatus(id, status, paymentStatus) {
      const b = bookings.get(id)!
      b.status = status
      if (paymentStatus) b.paymentStatus = paymentStatus
      return structuredClone(b)
    },
    async listReviewsForBooking(bookingId) {
      return reviews.filter((r) => r.bookingId === bookingId)
    },
    async listReviewsForListing(listingId) {
      return reviews.filter((r) => r.listingId === listingId)
    },
    async listReviewsForUser(userId) {
      return reviews.filter((r) => r.targetUserId === userId)
    },
    async createReview(r) {
      const created = { ...r, id: `r${++n}`, createdAt: new Date().toISOString() }
      reviews.push(created)
      return created
    },
    async setUserRating(userId, avg, count) {
      userRatings.set(userId, { avg, count })
    },
  }
  return { store, listings, bookings, reviews, userRatings }
}
