/**
 * Booking and review rules, independent of AWS so they can be unit tested.
 * Each Lambda handler supplies a Store backed by the Amplify data client.
 */
import { ID_NEEDED } from '../../../shared/idCheck'
import { bookingProblem, canTransition } from '../../../shared/bookingRules'
import { FEES } from '../../../shared/fees'
import { ownerStatsFrom } from '../../../shared/earnings'
import { addMonths, monthSchedule, noticeEnd, occupiedDates, quoteListing, quoteListingMonths, termOf } from '../../../shared/pricing'
import type { Booking, BookingStatus, ISODate, Listing, OwnerStats, Review, BookingFee, FeeStatus } from '../../../shared/types'

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
  /** The booking fee's state (see bookingFee.ts). */
  setBookingFee(id: string, fee: Partial<BookingFee> & { status: FeeStatus }): Promise<void>
  /** Monthly rentals: payments marked and notice given. */
  updateBookingTerms(id: string, patch: Pick<Partial<Booking>, 'paidMonths' | 'notice' | 'end'>): Promise<StoredBooking>
  listReviewsForBooking(bookingId: string): Promise<Review[]>
  listReviewsForListing(listingId: string): Promise<Review[]>
  listReviewsForUser(userId: string): Promise<Review[]>
  createReview(r: Omit<Review, 'id' | 'createdAt'>): Promise<Review>
  setUserRating(userId: string, avg: number, count: number): Promise<void>
  /** Whether this person has checked their ID through DigiLocker. */
  isIdChecked(userId: string): Promise<boolean>
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
  /** Ignored for monthly requests: the end is worked out from `months`. */
  end: ISODate
  delivery: boolean
  message?: string | null
  /** Set for a monthly rental. */
  months?: number | null
}

export async function requestBooking(store: Store, input: RequestBookingInput, actorId: string, today: ISODate, opts: { requireId?: boolean } = {}): Promise<StoredBooking> {
  const listing = await store.getListing(input.listingId)
  if (!listing) throw new RuleError('That listing doesn’t exist any more.')
  // With ID checks switched on, only people with a checked ID can ask to rent.
  if (opts.requireId && listing.ownerId !== actorId && !(await store.isIdChecked(actorId))) throw new RuleError(ID_NEEDED.rent)

  // Availability is checked against fresh bookings, not the cached calendar.
  const monthly = input.months != null
  let end = input.end
  if (monthly) {
    try {
      end = addMonths(input.start, input.months!)
    } catch {
      throw new RuleError('Those dates don’t look right. Pick them again.')
    }
  }
  const req = { start: input.start, end, delivery: input.delivery, term: monthly ? ('months' as const) : ('days' as const), months: input.months ?? undefined }
  const existing = await store.listBookingsForListing(listing.id)
  const unavailable = [...listing.blockedDates, ...datesTakenBy(existing)]
  const problem = bookingProblem({ ...listing, blockedDates: unavailable }, req, actorId, today)
  if (problem) throw new RuleError(problem)

  const mine = existing.find((b) => b.renterId === actorId && b.status === 'requested' && b.start === input.start && b.end === end)
  if (mine) throw new RuleError('You’ve already asked for these dates. The owner will reply soon.')

  const message = input.message?.trim().slice(0, 500)
  return store.createBooking({
    listingId: listing.id,
    renterId: actorId,
    ownerId: listing.ownerId,
    participants: [actorId, listing.ownerId],
    start: input.start,
    end,
    delivery: input.delivery,
    // Priced here, from the stored listing. Nothing from the browser is trusted.
    quote: monthly ? quoteListingMonths(listing, input.start, input.months!, input.delivery) : quoteListing(listing, input.start, end, input.delivery),
    ...(monthly ? { paidMonths: 0 } : {}),
    status: 'requested',
    paymentStatus: 'pay-at-pickup',
    ...(message ? { message } : {}),
  })
}

export type BookingAction = 'accept' | 'decline' | 'cancel' | 'handover' | 'return' | 'markPaid' | 'giveNotice'

const ACTION_STATUS: Record<Exclude<BookingAction, 'markPaid' | 'giveNotice'>, BookingStatus> = {
  accept: 'accepted',
  decline: 'declined',
  cancel: 'cancelled',
  handover: 'active',
  return: 'completed',
}

export async function respondToBooking(
  store: Store,
  bookingId: string,
  action: BookingAction,
  actorId: string,
  today?: ISODate,
  /** When online payments are on: the fee the renter pays after acceptance. */
  opts: { bookingFee?: number } = {},
): Promise<StoredBooking> {
  const booking = await store.getBooking(bookingId)
  if (!booking || !booking.participants.includes(actorId)) throw new RuleError('Booking not found.')
  if (action === 'markPaid' || action === 'giveNotice') return monthlyAction(store, booking, action, actorId, today)
  const to = ACTION_STATUS[action]
  if (!to || !canTransition(booking, to, actorId)) throw new RuleError('This booking can’t be changed that way now.')
  if (to === 'active' && booking.fee?.status === 'due') throw new RuleError('The renter needs to pay the booking fee before you hand it over.')

  const others = await store.listBookingsForListing(booking.listingId)
  if (action === 'accept') {
    const taken = new Set(datesTakenBy(others, booking.id))
    if (occupiedDates(booking.start, booking.end).some((d) => taken.has(d))) {
      throw new RuleError('Those dates are no longer free, so this request can’t be accepted.')
    }
  }

  let updated = await store.setBookingStatus(booking.id, to, to === 'completed' ? 'paid' : undefined)
  // The booking fee: due once accepted; refunded if the owner cancels after it's paid (not if the renter does).
  if (to === 'accepted' && opts.bookingFee) {
    await store.setBookingFee(booking.id, { status: 'due', amount: opts.bookingFee })
    updated = { ...updated, fee: { status: 'due', amount: opts.bookingFee } }
  }
  if (to === 'cancelled' && actorId === booking.ownerId && booking.fee?.status === 'paid') {
    await store.setBookingFee(booking.id, { status: 'refund_due' })
    updated = { ...updated, fee: { ...booking.fee, status: 'refund_due' } }
  }

  // Keep the public calendar in step with accepted and in-progress bookings.
  if (['accepted', 'cancelled', 'completed'].includes(to)) {
    const after = others.map((b) => (b.id === updated.id ? updated : b))
    await store.setListingBookedDates(booking.listingId, datesTakenBy(after))
  }
  return updated
}

/**
 * Monthly rentals, while the item is with the renter:
 * - the owner marks each month's rent as paid, in order;
 * - either side gives one month's notice, which moves the end date (once).
 */
async function monthlyAction(store: Store, b: StoredBooking, action: 'markPaid' | 'giveNotice', actorId: string, today: ISODate | undefined): Promise<StoredBooking> {
  if (termOf(b.quote) !== 'months' || b.status !== 'active') throw new RuleError('This booking can’t be changed that way now.')
  const schedule = monthSchedule(b.start, b.end, b.quote.monthlyRate!)
  if (action === 'markPaid') {
    if (actorId !== b.ownerId) throw new RuleError('Only the owner can mark rent as paid.')
    const paid = b.paidMonths ?? 0
    if (paid >= schedule.length) throw new RuleError('Every month is already marked as paid.')
    return store.updateBookingTerms(b.id, { paidMonths: paid + 1 })
  }
  if (b.notice) throw new RuleError('Notice has already been given for this rental.')
  if (!today) throw new Error('today is required for notice')
  const end = noticeEnd(today, b)
  const updated = await store.updateBookingTerms(b.id, { notice: { at: new Date().toISOString(), by: actorId }, end, paidMonths: Math.min(b.paidMonths ?? 0, monthSchedule(b.start, end, b.quote.monthlyRate!).length) })
  // The days after the new end are free again.
  const others = await store.listBookingsForListing(b.listingId)
  await store.setListingBookedDates(b.listingId, datesTakenBy(others.map((x) => (x.id === updated.id ? updated : x))))
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

export type { OwnerStats }

/** Owner dashboard figures. `month` is `YYYY-MM` in India time. */
export async function ownerStats(store: Store, ownerId: string, month: string): Promise<OwnerStats> {
  return ownerStatsFrom(await store.listBookingsForOwner(ownerId), month)
}

/** Exposed for the dashboard copy, so server and UI agree. */
export const OWNER_COMMISSION_PCT = FEES.ownerCommissionPct
