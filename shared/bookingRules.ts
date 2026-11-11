import { addMonths, isRangeAvailable, parseISODate, rentalDays, rentsByDay, rentsByMonth } from './pricing'
import type { Booking, BookingStatus, ISODate, Listing } from './types'

export interface BookingCheckInput {
  start: ISODate
  /** Return date. For monthly rentals it must be `start` plus `months` calendar months. */
  end: ISODate
  delivery: boolean
  term?: 'days' | 'months'
  months?: number
}

/** Furthest ahead a rental can start. */
export const MAX_START_AHEAD_MONTHS = 12

/**
 * Why a booking request can't go ahead, in words the renter can act on.
 * Returns null when it's fine. Used by the browser for instant feedback and
 * by the server (requestBooking Lambda) as the real gatekeeper.
 */
export function bookingProblem(
  listing: Pick<Listing, 'ownerId' | 'status' | 'minDays' | 'maxDays' | 'pickupOptions' | 'blockedDates' | 'pricing' | 'months'>,
  req: BookingCheckInput,
  renterId: string,
  today: ISODate,
): string | null {
  if (listing.status !== 'active') return 'This listing isn’t taking bookings right now.'
  if (listing.ownerId === renterId) return 'You can’t book your own listing.'
  try {
    parseISODate(req.start)
    parseISODate(req.end)
  } catch {
    return 'Those dates don’t look right. Pick them again from the calendar.'
  }
  if (req.start < today) return 'Pickup date has already passed. Choose a date from today onwards.'
  if (req.start > addMonths(today, MAX_START_AHEAD_MONTHS)) return 'That’s too far ahead. Choose a start date within the next year.'
  if (req.term === 'months') {
    if (!rentsByMonth(listing)) return 'This item isn’t rented by the month.'
    const m = req.months
    if (!Number.isInteger(m) || m! < listing.months!.min) return `The owner rents this for at least ${listing.months!.min} ${listing.months!.min === 1 ? 'month' : 'months'}.`
    if (m! > listing.months!.max) return `The owner rents this for up to ${listing.months!.max} months at a time.`
    if (req.end !== addMonths(req.start, m!)) return 'Those dates don’t look right. Pick them again.'
  } else {
    if (!rentsByDay(listing)) return 'This item is rented by the month. Choose how many months you need.'
    if (req.end < req.start) return 'Return date needs to be after pickup.'
    const days = rentalDays(req.start, req.end)
    if (days < listing.minDays) return `The owner rents this for at least ${listing.minDays} days.`
    if (days > listing.maxDays) return `The owner rents this for up to ${listing.maxDays} days at a time.`
  }
  if (req.delivery && !listing.pickupOptions.includes('delivery')) return 'This owner doesn’t deliver. Choose pickup instead.'
  if (!req.delivery && !listing.pickupOptions.includes('pickup')) return 'This item is delivery only.'
  if (!isRangeAvailable(req.start, req.end, listing.blockedDates)) return 'Some of those dates are already booked. Try different dates.'
  return null
}

/** Which status changes each person may make. */
export function canTransition(
  booking: Pick<Booking, 'status' | 'ownerId' | 'renterId'>,
  to: BookingStatus,
  actorId: string,
): boolean {
  const isOwner = actorId === booking.ownerId
  const isRenter = actorId === booking.renterId
  switch (to) {
    case 'accepted':
    case 'declined':
      return isOwner && booking.status === 'requested'
    case 'cancelled':
      return (isRenter && (booking.status === 'requested' || booking.status === 'accepted')) || (isOwner && booking.status === 'accepted')
    case 'active':
      return isOwner && booking.status === 'accepted'
    case 'completed':
      return isOwner && booking.status === 'active'
    default:
      return false
  }
}
