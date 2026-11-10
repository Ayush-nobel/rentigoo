import { describe, expect, it } from 'vitest'
import { bestRent, isRangeAvailable, occupiedDates, parseISODate, quote, rentalDays } from './pricing'

describe('rentalDays', () => {
  it('counts nights between pickup and return', () => {
    expect(rentalDays('2026-11-10', '2026-11-13')).toBe(3)
  })
  it('treats same-day as one day', () => {
    expect(rentalDays('2026-11-10', '2026-11-10')).toBe(1)
  })
  it('crosses month and year boundaries', () => {
    expect(rentalDays('2026-12-30', '2027-01-02')).toBe(3)
  })
  it('rejects a return before pickup', () => {
    expect(() => rentalDays('2026-11-13', '2026-11-10')).toThrow()
  })
  it('rejects impossible dates', () => {
    expect(() => parseISODate('2026-02-31')).toThrow()
    expect(() => parseISODate('10/11/2026')).toThrow()
  })
})

describe('availability', () => {
  it('lists occupied dates without the return day', () => {
    expect(occupiedDates('2026-11-10', '2026-11-12')).toEqual(['2026-11-10', '2026-11-11'])
  })
  it('lets the next renter pick up on the return day', () => {
    expect(isRangeAvailable('2026-11-10', '2026-11-12', ['2026-11-12'])).toBe(true)
    expect(isRangeAvailable('2026-11-10', '2026-11-12', ['2026-11-11'])).toBe(false)
  })
})

describe('bestRent', () => {
  const pricing = { daily: 500, weekly: 2800, monthly: 9000 }
  it('uses daily rate for short rentals', () => {
    expect(bestRent(3, pricing)).toBe(1500)
  })
  it('rounds up to a week when cheaper', () => {
    // 6 × 500 = 3000 > one week at 2800
    expect(bestRent(6, pricing)).toBe(2800)
  })
  it('mixes weeks and days', () => {
    expect(bestRent(9, pricing)).toBe(2800 + 1000)
  })
  it('uses the monthly rate for long rentals', () => {
    expect(bestRent(30, pricing)).toBe(9000)
  })
  it('works with daily-only pricing', () => {
    expect(bestRent(10, { daily: 300 })).toBe(3000)
  })
  it('rejects zero or fractional days', () => {
    expect(() => bestRent(0, pricing)).toThrow()
    expect(() => bestRent(1.5, pricing)).toThrow()
  })
})

describe('quote', () => {
  it('builds the full breakdown', () => {
    const q = quote({
      pricing: { daily: 1000 },
      deposit: 5000,
      deliveryFee: 200,
      start: '2026-11-10',
      end: '2026-11-13',
      delivery: true,
    })
    expect(q).toMatchObject({
      days: 3,
      rentalSubtotal: 3000,
      longStayDiscount: 0,
      serviceFee: 240, // 8%
      gstOnFee: 43, // 18% of 240 = 43.2
      deliveryFee: 200,
      totalRent: 3483,
      refundableDeposit: 5000,
      totalDue: 8483,
      ownerPayout: 2700 + 200, // 10% commission, delivery fee to owner
    })
  })
  it('skips the delivery fee for pickup', () => {
    const q = quote({ pricing: { daily: 1000 }, deposit: 0, deliveryFee: 200, start: '2026-11-10', end: '2026-11-11', delivery: false })
    expect(q.deliveryFee).toBe(0)
  })
  it('shows the long-stay saving', () => {
    const q = quote({ pricing: { daily: 500, weekly: 2800 }, deposit: 0, start: '2026-11-01', end: '2026-11-08', delivery: false })
    expect(q.rentalSubtotal).toBe(2800)
    expect(q.longStayDiscount).toBe(700)
  })
})
