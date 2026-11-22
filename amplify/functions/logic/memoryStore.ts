import type { Review } from '../../../shared/types'
import type { StoredBooking, StoredListing } from './bookings'
import type { AccountStore } from './account'
import type { ListingStore } from './listings'

/** In-memory Store for tests. */
export function memoryStore(
  seed: { listings?: StoredListing[]; bookings?: StoredBooking[]; reviews?: Review[]; messages?: { id: string; senderId: string; text: string }[]; profiles?: string[] } = {},
) {
  const listings = new Map((seed.listings ?? []).map((l) => [l.id, structuredClone(l)]))
  const bookings = new Map((seed.bookings ?? []).map((b) => [b.id, structuredClone(b)]))
  const reviews: Review[] = structuredClone(seed.reviews ?? [])
  const userRatings = new Map<string, { avg: number; count: number }>()
  const messages = structuredClone(seed.messages ?? [])
  const profiles = new Set(seed.profiles ?? [])
  const logins = new Set(seed.profiles ?? [])
  const deletedPhotos: string[] = []
  /** Bill records by listing id, and the bill files "uploaded". */
  const receipts = new Map<string, { ownerId: string; key: string }>()
  const uploadedReceipts = new Set<string>()
  /** People who have checked their ID. */
  const idChecked = new Set<string>()
  const rebuilds = { count: 0 }
  const forgottenPhones: string[] = []
  let n = 0

  const store: AccountStore & ListingStore = {
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
    async setBookingFee(id, fee) {
      const b = bookings.get(id)!
      b.fee = { ...(b.fee ?? { amount: 0 }), ...fee }
    },
    async updateBookingTerms(id, patch) {
      Object.assign(bookings.get(id)!, patch)
      return structuredClone(bookings.get(id)!)
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
    async listBookingsAsRenter(userId) {
      return [...bookings.values()].filter((b) => b.renterId === userId).map((b) => structuredClone(b))
    },
    async listListingsOwnedBy(userId) {
      return [...listings.values()].filter((l) => l.ownerId === userId).map((l) => structuredClone(l))
    },
    async deleteListing(id) {
      receipts.delete(id)
      listings.delete(id)
    },
    async isIdChecked(userId) {
      return idChecked.has(userId)
    },
    async receiptExists(key) {
      return uploadedReceipts.has(key)
    },
    async getReceiptKey(listingId) {
      return receipts.get(listingId)?.key ?? null
    },
    async setReceipt(listingId, ownerId, key) {
      receipts.set(listingId, { ownerId, key })
    },
    async deleteReceipt(listingId) {
      receipts.delete(listingId)
    },
    async createListing(l) {
      const created: StoredListing = { ...l, id: `l${++n}`, bookedDates: [], ratingAvg: 0, ratingCount: 0, createdAt: new Date().toISOString() }
      listings.set(created.id, created)
      return structuredClone(created)
    },
    async updateListing(id, l) {
      const cur = listings.get(id)!
      const { deliveryFee: _drop, ...rest } = cur
      const next: StoredListing = { ...rest, ...l }
      listings.set(id, next)
      return structuredClone(next)
    },
    async publicListingsChanged() {
      rebuilds.count++
    },
    async deleteConditionReportsBy() {},
    async forgetId() {},
    async deletePhotoFolders(prefixes) {
      deletedPhotos.push(...prefixes)
    },
    async deletePhotos(keys) {
      deletedPhotos.push(...keys)
    },
    async listReviewsByAuthor(userId) {
      return reviews.filter((r) => r.authorId === userId)
    },
    async deleteReview(id) {
      const i = reviews.findIndex((r) => r.id === id)
      if (i >= 0) reviews.splice(i, 1)
    },
    async listMessageIdsBySender(userId) {
      return messages.filter((m) => m.senderId === userId).map((m) => m.id)
    },
    async redactMessage(id, text) {
      const m = messages.find((x) => x.id === id)
      if (m) m.text = text
    },
    async clearBookingMessage(id) {
      delete bookings.get(id)!.message
    },
    async forgetPhone(id) {
      forgottenPhones.push(id)
    },
    async deleteProfile(id) {
      profiles.delete(id)
    },
    async deleteLogin(id) {
      logins.delete(id)
    },
  }
  return { store, listings, bookings, reviews, userRatings, messages, profiles, logins, deletedPhotos, rebuilds, forgottenPhones, receipts, uploadedReceipts, idChecked }
}
