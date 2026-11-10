import { isRangeAvailable, parseISODate, rentalDays } from './pricing'
import type { Booking, BookingStatus, ISODate, Listing } from './types'

export interface BookingCheckInput {
  start: ISODate
  end: ISODate
  delivery: boolean
}

/**
 * Why a booking request can't go ahead, in words the renter can act on.
 * Returns null when it's fine. Used by the browser for instant feedback and
 * by the server (requestBooking Lambda) as the real gatekeeper.
 */
export function bookingProblem(
  listing: Pick<Listing, 'ownerId' | 'status' | 'minDays' | 'maxDays' | 'pickupOptions' | 'blockedDates'>,
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
  if (req.end < req.start) return 'Return date needs to be after pickup.'
  const days = rentalDays(req.start, req.end)
  if (days < listing.minDays) return `The owner rents this for at least ${listing.minDays} days.`
  if (days > listing.maxDays) return `The owner rents this for up to ${listing.maxDays} days at a time.`
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
