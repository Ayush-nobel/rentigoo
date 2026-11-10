import { FEES, type Fees } from './fees'
import type { ISODate, Listing, PriceQuote } from './types'

const DAY_MS = 86_400_000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Parse `YYYY-MM-DD` as a UTC midnight timestamp. Throws on malformed input. */
export function parseISODate(date: ISODate): number {
  if (!ISO_DATE.test(date)) throw new Error(`Invalid date: ${date}`)
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const t = Date.UTC(y, m - 1, d)
  // Reject dates like 2026-02-31 that Date.UTC silently rolls over.
  if (new Date(t).toISOString().slice(0, 10) !== date) throw new Error(`Invalid date: ${date}`)
  return t
}

export function toISODate(t: number): ISODate {
  return new Date(t).toISOString().slice(0, 10)
}

export function addDays(date: ISODate, n: number): ISODate {
  return toISODate(parseISODate(date) + n * DAY_MS)
}

/**
 * Number of rental days between pickup (`start`) and return (`end`).
 * Same-day pickup and return counts as one day.
 */
export function rentalDays(start: ISODate, end: ISODate): number {
  const diff = Math.round((parseISODate(end) - parseISODate(start)) / DAY_MS)
  if (diff < 0) throw new Error('Return date is before pickup date')
  return Math.max(1, diff)
}

/** The calendar dates the item is out with the renter (return day is free for the next renter). */
export function occupiedDates(start: ISODate, end: ISODate): ISODate[] {
  const days = rentalDays(start, end)
  return Array.from({ length: days }, (_, i) => addDays(start, i))
}

export function isRangeAvailable(start: ISODate, end: ISODate, blocked: Iterable<ISODate>): boolean {
  const set = new Set(blocked)
  return occupiedDates(start, end).every((d) => !set.has(d))
}

/**
 * Cheapest rent for `days`, mixing monthly, weekly and daily rates.
 * Rounding up to a whole week/month is allowed when that's cheaper
 * (e.g. 6 days at daily rate can cost more than one weekly rate).
 */
export function bestRent(
  days: number,
  pricing: Listing['pricing'],
  fees: Pick<Fees, 'daysPerWeek' | 'daysPerMonth'> = FEES,
): number {
  if (!Number.isInteger(days) || days < 1) throw new Error('Days must be a whole number of at least 1')
  const { daily, weekly, monthly } = pricing
  const memo = new Map<number, number>()

  const cost = (d: number): number => {
    if (d <= 0) return 0
    const hit = memo.get(d)
    if (hit !== undefined) return hit
    let best = d * daily
    if (weekly !== undefined) {
      best = Math.min(best, weekly + cost(d - fees.daysPerWeek))
    }
    if (monthly !== undefined) {
      best = Math.min(best, monthly + cost(d - fees.daysPerMonth))
    }
    memo.set(d, best)
    return best
  }

  return cost(days)
}

const pct = (amount: number, percent: number) => Math.round((amount * percent) / 100)

export interface QuoteInput {
  pricing: Listing['pricing']
  deposit: number
  deliveryFee?: number
  start: ISODate
  end: ISODate
  delivery: boolean
}

/** The full price breakdown for a booking. Whole rupees throughout. */
export function quote(input: QuoteInput, fees: Fees = FEES): PriceQuote {
  const days = rentalDays(input.start, input.end)
  const dailyRate = input.pricing.daily
  const undiscountedSubtotal = days * dailyRate
  const rentalSubtotal = bestRent(days, input.pricing, fees)
  const serviceFee = pct(rentalSubtotal, fees.serviceFeePct)
  const gstOnFee = pct(serviceFee, fees.gstOnFeePct)
  const deliveryFee = input.delivery ? (input.deliveryFee ?? 0) : 0
  const totalRent = rentalSubtotal + serviceFee + gstOnFee + deliveryFee
  const refundableDeposit = input.deposit

  return {
    days,
    dailyRate,
    undiscountedSubtotal,
    rentalSubtotal,
    longStayDiscount: undiscountedSubtotal - rentalSubtotal,
    serviceFee,
    gstOnFee,
    deliveryFee,
    totalRent,
    refundableDeposit,
    totalDue: totalRent + refundableDeposit,
    ownerPayout: rentalSubtotal - pct(rentalSubtotal, fees.ownerCommissionPct) + deliveryFee,
  }
}

/** Convenience wrapper for a listing. */
export function quoteListing(
  listing: Pick<Listing, 'pricing' | 'deposit' | 'deliveryFee'>,
  start: ISODate,
  end: ISODate,
  delivery = false,
  fees: Fees = FEES,
): PriceQuote {
  return quote({ pricing: listing.pricing, deposit: listing.deposit, deliveryFee: listing.deliveryFee, start, end, delivery }, fees)
}
