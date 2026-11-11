import { FEES, type Fees } from './fees'
import type { ISODate, Listing, PriceQuote, RentalTerm } from './types'

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

/**
 * The same day `n` calendar months later. Clamped to the month's last day,
 * so 31 Jan + 1 month is 28 Feb (29 in a leap year).
 */
export function addMonths(date: ISODate, n: number): ISODate {
  parseISODate(date)
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = total % 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return toISODate(Date.UTC(ny, nm, Math.min(d, last)))
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
  if (daily === undefined) throw new Error('This listing has no daily price')
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

/** Whether a listing can be booked by the day, and by the month. */
export function rentsByDay(l: Pick<Listing, 'pricing'>): boolean {
  return l.pricing.daily !== undefined
}
export function rentsByMonth(l: Pick<Listing, 'pricing' | 'months'>): boolean {
  return l.pricing.monthly !== undefined && l.months !== undefined
}

/** The price to lead with on cards and in search: per day if there is one, otherwise per month. */
export function headlinePrice(l: Pick<Listing, 'pricing' | 'months'>): { amount: number; per: 'day' | 'month' } {
  return l.pricing.daily !== undefined ? { amount: l.pricing.daily, per: 'day' } : { amount: l.pricing.monthly ?? 0, per: 'month' }
}

/** A rough per-day figure for sorting and price filters across both kinds of listing. */
export function dailyEquivalent(l: Pick<Listing, 'pricing'>, fees: Pick<Fees, 'daysPerMonth'> = FEES): number {
  return l.pricing.daily ?? Math.round((l.pricing.monthly ?? 0) / fees.daysPerMonth)
}

export interface QuoteInput {
  pricing: Listing['pricing']
  deposit: number
  deliveryFee?: number
  start: ISODate
  end: ISODate
  delivery: boolean
}

export interface MonthlyQuoteInput {
  pricing: Listing['pricing']
  deposit: number
  deliveryFee?: number
  start: ISODate
  months: number
  delivery: boolean
}

/** The full price breakdown for a booking. Whole rupees throughout. */
export function quote(input: QuoteInput, fees: Fees = FEES): PriceQuote {
  const days = rentalDays(input.start, input.end)
  const dailyRate = input.pricing.daily
  if (dailyRate === undefined) throw new Error('This listing has no daily price')
  const undiscountedSubtotal = days * dailyRate
  const rentalSubtotal = bestRent(days, input.pricing, fees)
  const serviceFee = pct(rentalSubtotal, fees.serviceFeePct)
  const gstOnFee = pct(serviceFee, fees.gstOnFeePct)
  const deliveryFee = input.delivery ? (input.deliveryFee ?? 0) : 0
  const totalRent = rentalSubtotal + serviceFee + gstOnFee + deliveryFee
  const refundableDeposit = input.deposit

  return {
    term: 'days',
    dueAtPickup: totalRent + refundableDeposit,
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

/**
 * A monthly rental: the monthly price for each calendar month. The deposit,
 * delivery fee and first month are paid at pickup; each later month on its
 * start date. Fees (zero today) apply to the whole rent.
 */
export function monthlyQuote(input: MonthlyQuoteInput, fees: Fees = FEES): PriceQuote {
  const rate = input.pricing.monthly
  if (rate === undefined) throw new Error('This listing has no monthly price')
  if (!Number.isInteger(input.months) || input.months < 1) throw new Error('Months must be a whole number of at least 1')
  const end = addMonths(input.start, input.months)
  const days = rentalDays(input.start, end)
  const rentalSubtotal = rate * input.months
  const serviceFee = pct(rentalSubtotal, fees.serviceFeePct)
  const gstOnFee = pct(serviceFee, fees.gstOnFeePct)
  const deliveryFee = input.delivery ? (input.deliveryFee ?? 0) : 0
  const totalRent = rentalSubtotal + serviceFee + gstOnFee + deliveryFee
  const firstMonthFees = pct(rate, fees.serviceFeePct) + pct(pct(rate, fees.serviceFeePct), fees.gstOnFeePct)
  return {
    term: 'months',
    months: input.months,
    monthlyRate: rate,
    dueAtPickup: rate + firstMonthFees + deliveryFee + input.deposit,
    days,
    dailyRate: Math.round(rate / fees.daysPerMonth),
    undiscountedSubtotal: rentalSubtotal,
    rentalSubtotal,
    longStayDiscount: 0,
    serviceFee,
    gstOnFee,
    deliveryFee,
    totalRent,
    refundableDeposit: input.deposit,
    totalDue: totalRent + input.deposit,
    ownerPayout: rentalSubtotal - pct(rentalSubtotal, fees.ownerCommissionPct) + deliveryFee,
  }
}

export interface MonthPeriod {
  /** 1-based. */
  n: number
  start: ISODate
  /** The day it ends (the next period's start, or the rental's end). */
  end: ISODate
  /** Rent due on `start`. A shortened last month is charged per day. */
  amount: number
  partial: boolean
}

/**
 * Each month of a monthly rental, with what's due when. If the rental ends
 * early (notice), the months after the end are dropped and a shortened last
 * month is charged per day at the monthly price ÷ 30.
 */
export function monthSchedule(start: ISODate, end: ISODate, monthlyRate: number, fees: Pick<Fees, 'daysPerMonth'> = FEES): MonthPeriod[] {
  const out: MonthPeriod[] = []
  for (let n = 1; ; n++) {
    const pStart = addMonths(start, n - 1)
    if (pStart >= end) break
    const fullEnd = addMonths(start, n)
    const pEnd = fullEnd < end ? fullEnd : end
    const partial = pEnd < fullEnd
    const amount = partial ? Math.round((monthlyRate * rentalDays(pStart, pEnd)) / fees.daysPerMonth) : monthlyRate
    out.push({ n, start: pStart, end: pEnd, amount: Math.min(amount, monthlyRate), partial })
    if (n > 240) break
  }
  return out
}

/**
 * When a monthly rental ends after notice given `today`: one month later
 * (counted from the start date if it hasn't begun yet), never cutting short a
 * month that's already been paid, and never past the booked end.
 */
export function noticeEnd(today: ISODate, b: { start: ISODate; end: ISODate; paidMonths?: number }): ISODate {
  const from = today > b.start ? today : b.start
  let e = addMonths(from, 1)
  const paidThrough = addMonths(b.start, b.paidMonths ?? 0)
  if (paidThrough > e) e = paidThrough
  return e < b.end ? e : b.end
}

/** The term a booking request is for. */
export function termOf(q: Pick<PriceQuote, 'term'>): RentalTerm {
  return q.term ?? 'days'
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

/** Convenience wrapper for a monthly booking of a listing. */
export function quoteListingMonths(
  listing: Pick<Listing, 'pricing' | 'deposit' | 'deliveryFee'>,
  start: ISODate,
  months: number,
  delivery = false,
  fees: Fees = FEES,
): PriceQuote {
  return monthlyQuote({ pricing: listing.pricing, deposit: listing.deposit, deliveryFee: listing.deliveryFee, start, months, delivery }, fees)
}
