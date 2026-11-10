/**
 * Booking and review rules, independent of AWS so they can be unit tested.
 * Each Lambda handler supplies a Store backed by the Amplify data client.
 */
import { bookingProblem, canTransition } from '../../../shared/bookingRules'
import { FEES } from '../../../shared/fees'
import { occupiedDates, quoteListing } from '../../../shared/pricing'
import type { Booking, BookingStatus, ISODate, Listing, Review } from '../../../shared/types'

/** Listing as stored: owner-set blocked days plus server-maintained booked days. */
export type StoredListing = Listing & { bookedDates: ISODate[] }
export type StoredBooking = Booking & { participants: string[] }

export interface Store {
  getListing(id: string): Promise<StoredListing | null>
  setListingBookedDates(id: string, dates: ISODate[]): Promise<void>
  setListingRating(id: string, avg: number, count: number): Promise<void>
  getBooking(id: string): Promise<StoredBooking | null>
  listBookingsForListing(listingId: string): Promise<StoredBooking[]>
  listBookingsForOwner(ownerId: string): Promise<StoredBooking[]>
  createBooking(b: Omit<StoredBooking, 'id' | 'createdAt'>): Promise<StoredBooking>
  setBookingStatus(id: string, status: BookingStatus, paymentStatus?: Booking['paymentStatus']): Promise<StoredBooking>
  listReviewsForBooking(bookingId: string): Promise<Review[]>
  listReviewsForListing(listingId: string): Promise<Review[]>
  listReviewsForUser(userId: string): Promise<Review[]>
  createReview(r: Omit<Review, 'id' | 'createdAt'>): Promise<Review>
  setUserRating(userId: string, avg: number, count: number): Promise<void>
}

/** A problem the person can fix; the handler turns it into a GraphQL error. */
export class RuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuleError'
  }
}

export const BLOCKING: BookingStatus[] = ['accepted', 'active']

function datesTakenBy(bookings: StoredBooking[], exceptId?: string): ISODate[] {
  return [
    ...new Set(bookings.filter((b) => b.id !== exceptId && BLOCKING.includes(b.status)).flatMap((b) => occupiedDates(b.start, b.end))),
  ].sort()
}

export interface RequestBookingInput {
  listingId: string
  start: ISODate
  end: ISODate
  delivery: boolean
  message?: string | null
}

export async function requestBooking(store: Store, input: RequestBookingInput, actorId: string, today: ISODate): Promise<StoredBooking> {
  const listing = await store.getListing(input.listingId)
  if (!listing) throw new RuleError('That listing doesn’t exist any more.')

  // Availability is checked against fresh bookings, not the cached calendar.
  const existing = await store.listBookingsForListing(listing.id)
  const unavailable = [...listing.blockedDates, ...datesTakenBy(existing)]
  const problem = bookingProblem({ ...listing, blockedDates: unavailable }, input, actorId, today)
  if (problem) throw new RuleError(problem)

  const mine = existing.find((b) => b.renterId === actorId && b.status === 'requested' && b.start === input.start && b.end === input.end)
  if (mine) throw new RuleError('You’ve already asked for these dates. The owner will reply soon.')

  const message = input.message?.trim().slice(0, 500)
  return store.createBooking({
    listingId: listing.id,
    renterId: actorId,
    ownerId: listing.ownerId,
    participants: [actorId, listing.ownerId],
    start: input.start,
    end: input.end,
    delivery: input.delivery,
    // Priced here, from the stored listing. Nothing from the browser is trusted.
    quote: quoteListing(listing, input.start, input.end, input.delivery),
    status: 'requested',
    paymentStatus: 'pay-at-pickup',
    ...(message ? { message } : {}),
  })
}

export type BookingAction = 'accept' | 'decline' | 'cancel' | 'handover' | 'return'

const ACTION_STATUS: Record<BookingAction, BookingStatus> = {
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
  handover: 'active',
  return: 'completed',
}

export async function respondToBooking(store: Store, bookingId: string, action: BookingAction, actorId: string): Promise<StoredBooking> {
  const booking = await store.getBooking(bookingId)
  if (!booking || !booking.participants.includes(actorId)) throw new RuleError('Booking not found.')
  const to = ACTION_STATUS[action]
  if (!to || !canTransition(booking, to, actorId)) throw new RuleError('This booking can’t be changed that way now.')

  const others = await store.listBookingsForListing(booking.listingId)
  if (action === 'accept') {
    const taken = new Set(datesTakenBy(others, booking.id))
    if (occupiedDates(booking.start, booking.end).some((d) => taken.has(d))) {
      throw new RuleError('Those dates are no longer free, so this request can’t be accepted.')
    }
  }

  const updated = await store.setBookingStatus(booking.id, to, to === 'completed' ? 'paid' : undefined)

  // Keep the public calendar in step with accepted and in-progress bookings.
  if (['accepted', 'cancelled', 'completed'].includes(to)) {
    const after = others.map((b) => (b.id === updated.id ? updated : b))
    await store.setListingBookedDates(booking.listingId, datesTakenBy(after))
  }
  return updated
}

export interface ReviewInput {
  bookingId: string
  rating: number
  text: string
}

const round1 = (n: number) => Math.round(n * 10) / 10
const average = (rs: Review[]) => (rs.length ? round1(rs.reduce((s, r) => s + r.rating, 0) / rs.length) : 0)

export async function submitReview(store: Store, input: ReviewInput, actorId: string): Promise<Review> {
  const booking = await store.getBooking(input.bookingId)
  if (!booking || !booking.participants.includes(actorId)) throw new RuleError('Booking not found.')
  if (booking.status !== 'completed') throw new RuleError('You can review once the item has been returned.')
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new RuleError('Choose a rating from 1 to 5 stars.')
  const text = input.text.trim()
  if (text.length < 10) throw new RuleError('Write a few words about how it went (at least 10 characters).')
  if (text.length > 1000) throw new RuleError('Keep your review under 1,000 characters.')

  const existing = await store.listReviewsForBooking(booking.id)
  if (existing.some((r) => r.authorId === actorId)) throw new RuleError('You’ve already reviewed this rental.')

  const role = actorId === booking.renterId ? 'renter' : 'owner'
  const review = await store.createReview({
    listingId: booking.listingId,
    bookingId: booking.id,
    authorId: actorId,
    targetUserId: role === 'renter' ? booking.ownerId : booking.renterId,
    rating: input.rating as Review['rating'],
    text,
    role,
  })

  if (role === 'renter') {
    const forListing = (await store.listReviewsForListing(booking.listingId)).filter((r) => r.role === 'renter')
    await store.setListingRating(booking.listingId, average(forListing), forListing.length)
  }
  const forUser = await store.listReviewsForUser(review.targetUserId)
  await store.setUserRating(review.targetUserId, average(forUser), forUser.length)
  return review
}

export interface OwnerStats {
  earnedThisMonth: number
  earnedTotal: number
  pendingRequests: number
  activeRentals: number
  upcomingRentals: number
}

/** Owner dashboard figures. `month` is `YYYY-MM` in India time. */
export async function ownerStats(store: Store, ownerId: string, month: string): Promise<OwnerStats> {
  const bookings = await store.listBookingsForOwner(ownerId)
  const done = bookings.filter((b) => b.status === 'completed')
  return {
    earnedThisMonth: done.filter((b) => b.end.startsWith(month)).reduce((s, b) => s + b.quote.ownerPayout, 0),
    earnedTotal: done.reduce((s, b) => s + b.quote.ownerPayout, 0),
    pendingRequests: bookings.filter((b) => b.status === 'requested').length,
    activeRentals: bookings.filter((b) => b.status === 'active').length,
    upcomingRentals: bookings.filter((b) => b.status === 'accepted').length,
  }
}

/** Exposed for the dashboard copy, so server and UI agree. */
export const OWNER_COMMISSION_PCT = FEES.ownerCommissionPct
