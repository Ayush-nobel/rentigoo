/**
 * Deleting an account (DPDP Act right to erasure). Personal data goes; what
 * the law makes us keep (a minimal record of past transactions) stays, with
 * free-text notes wiped. Each step is safe to re-run if a later step fails.
 */
import { PHOTO_KEY } from '../../../shared/listingRules'
import { occupiedDates } from '../../../shared/pricing'
import type { Review } from '../../../shared/types'
import { BLOCKING, RuleError, type Store, type StoredBooking, type StoredListing } from './bookings'

export const REDACTED_MESSAGE = 'This message was removed when its sender deleted their account.'

export interface AccountStore extends Store {
  listBookingsAsRenter(userId: string): Promise<StoredBooking[]>
  listListingsOwnedBy(userId: string): Promise<StoredListing[]>
  deleteListing(id: string): Promise<void>
  /** Deletes every uploaded file under these folders (e.g. `listing-photos/<identity>/`). */
  deletePhotoFolders(prefixes: string[]): Promise<void>
  /** Their public listings went away: rebuild the site's pages. Never throws. */
  publicListingsChanged(): Promise<void>
  listReviewsByAuthor(userId: string): Promise<Review[]>
  deleteReview(id: string): Promise<void>
  listMessageIdsBySender(userId: string): Promise<string[]>
  redactMessage(id: string, text: string): Promise<void>
  clearBookingMessage(id: string): Promise<void>
  deleteProfile(id: string): Promise<void>
  deleteLogin(id: string): Promise<void>
}

export interface DeletionSummary {
  cancelledBookings: number
  deletedListings: number
  deletedReviews: number
  redactedMessages: number
}

const round1 = (n: number) => Math.round(n * 10) / 10
const avg = (rs: Review[]) => (rs.length ? round1(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0)

export async function deleteMyAccount(store: AccountStore, userId: string): Promise<DeletionSummary> {
  const asRenter = await store.listBookingsAsRenter(userId)
  const asOwner = await store.listBookingsForOwner(userId)
  const mine = [...new Map([...asRenter, ...asOwner].map((b) => [b.id, b])).values()]

  // 1. Not while an item is out with someone: it has to come back first.
  const out = mine.filter((b) => b.status === 'active')
  if (out.length) {
    throw new RuleError(
      `You have ${out.length === 1 ? 'a rental' : `${out.length} rentals`} in progress. Once the item is returned and marked as returned, you can delete your account.`,
    )
  }

  // 2. Cancel open bookings and free those dates on the listings.
  const open = mine.filter((b) => b.status === 'requested' || b.status === 'accepted')
  const touchedListings = new Set<string>()
  for (const b of open) {
    await store.setBookingStatus(b.id, 'cancelled')
    if (b.status === 'accepted') touchedListings.add(b.listingId)
  }
  const owned = await store.listListingsOwnedBy(userId)
  const ownedIds = new Set(owned.map((l) => l.id))
  for (const listingId of touchedListings) {
    if (ownedIds.has(listingId)) continue // about to be deleted anyway
    const left = (await store.listBookingsForListing(listingId)).filter((b) => BLOCKING.includes(b.status))
    await store.setListingBookedDates(listingId, [...new Set(left.flatMap((b) => occupiedDates(b.start, b.end)))].sort())
  }

  // 3. Their listings, and the photo folders those listings were uploaded to
  //    (whole folders, so photos uploaded but never saved go too).
  const folders = [
    ...new Set(owned.flatMap((l) => l.photos.map((p) => p.key)).filter((k) => PHOTO_KEY.test(k)).map((k) => `${k.split('/').slice(0, 2).join('/')}/`)),
  ]
  if (folders.length) await store.deletePhotoFolders(folders)
  for (const l of owned) await store.deleteListing(l.id)
  if (owned.some((l) => l.status === 'active')) await store.publicListingsChanged()

  // 4. Reviews they wrote and reviews about them; then fix everyone's averages.
  const written = await store.listReviewsByAuthor(userId)
  const about = await store.listReviewsForUser(userId)
  const reviews = [...new Map([...written, ...about].map((r) => [r.id, r])).values()]
  for (const r of reviews) await store.deleteReview(r.id)
  const listingsToRate = new Set(written.filter((r) => r.role === 'renter' && !ownedIds.has(r.listingId)).map((r) => r.listingId))
  for (const id of listingsToRate) {
    const rs = (await store.listReviewsForListing(id)).filter((r) => r.role === 'renter')
    await store.setListingRating(id, avg(rs), rs.length)
  }
  const peopleToRate = new Set(written.map((r) => r.targetUserId).filter((id) => id !== userId))
  for (const id of peopleToRate) {
    const rs = await store.listReviewsForUser(id)
    await store.setUserRating(id, avg(rs), rs.length)
  }

  // 5. Messages: blank their words, keep the other person's side readable.
  const messageIds = await store.listMessageIdsBySender(userId)
  for (const id of messageIds) await store.redactMessage(id, REDACTED_MESSAGE)

  // 6. Past bookings stay as minimal records; wipe the free-text note they wrote.
  for (const b of asRenter) if (b.message) await store.clearBookingMessage(b.id)

  // 7. Profile, then the login itself (last, so a failure can be retried while signed in).
  await store.deleteProfile(userId)
  await store.deleteLogin(userId)

  return { cancelledBookings: open.length, deletedListings: owned.length, deletedReviews: reviews.length, redactedMessages: messageIds.length }
}
