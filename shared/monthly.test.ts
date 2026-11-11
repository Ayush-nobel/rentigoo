import { describe, expect, it } from 'vitest'
import { FEES } from './fees'
import { addMonths, dailyEquivalent, headlinePrice, monthSchedule, monthlyQuote, noticeEnd, rentsByDay, rentsByMonth } from './pricing'

describe('addMonths', () => {
  it('keeps the day of the month', () => {
    expect(addMonths('2026-11-15', 1)).toBe('2026-12-15')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
  })
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2027-01-31', 2)).toBe('2027-03-31')
  })
})

describe('monthlyQuote', () => {
  it('charges each month, with the deposit and first month at pickup', () => {
    const q = monthlyQuote({ pricing: { monthly: 2500 }, deposit: 5000, start: '2026-12-01', months: 6, delivery: true, deliveryFee: 300 })
    expect(q).toMatchObject({ term: 'months', months: 6, monthlyRate: 2500, rentalSubtotal: 15000, totalRent: 15300, dueAtPickup: 2500 + 300 + 5000, refundableDeposit: 5000 })
    expect(q.days).toBe(182) // 1 Dec to 1 Jun
  })
  it('applies fees to the whole rent when they exist', () => {
    const q = monthlyQuote({ pricing: { monthly: 1000 }, deposit: 0, start: '2026-12-01', months: 3, delivery: false }, { ...FEES, serviceFeePct: 8, ownerCommissionPct: 10 })
    expect(q).toMatchObject({ serviceFee: 240, totalRent: 3240, ownerPayout: 2700, dueAtPickup: 1080 })
  })
})

describe('monthSchedule', () => {
  it('one payment per month, due on each month’s start', () => {
    const s = monthSchedule('2026-11-15', addMonths('2026-11-15', 3), 2500)
    expect(s.map((p) => [p.start, p.amount, p.partial])).toEqual([
      ['2026-11-15', 2500, false],
      ['2026-12-15', 2500, false],
      ['2027-01-15', 2500, false],
    ])
  })
  it('after notice: later months dropped, a short last month charged per day', () => {
    // Booked 15 Nov for 6 months; ends early on 1 Feb.
    const s = monthSchedule('2026-11-15', '2027-02-01', 3000)
    expect(s).toHaveLength(3)
    expect(s[2]).toMatchObject({ start: '2027-01-15', end: '2027-02-01', partial: true, amount: Math.round((3000 * 17) / 30) })
  })
})

describe('noticeEnd', () => {
  const b = { start: '2026-11-15', end: '2027-05-15' }
  it('is one month from today, never past the booked end', () => {
    expect(noticeEnd('2027-01-10', b)).toBe('2027-02-10')
    expect(noticeEnd('2027-05-01', b)).toBe('2027-05-15')
  })
  it('counts from the start date if handed over early', () => {
    expect(noticeEnd('2026-11-11', b)).toBe('2026-12-15')
  })
  it('never cuts short a month already paid', () => {
    // Months 1–3 paid (through 15 Feb); notice on 10 Jan would end 10 Feb.
    expect(noticeEnd('2027-01-10', { ...b, paidMonths: 3 })).toBe('2027-02-15')
  })
})

describe('listing kinds', () => {
  const daily = { pricing: { daily: 200 } }
  const monthly = { pricing: { monthly: 2400 }, months: { min: 1, max: 12 } }
  const both = { pricing: { daily: 200, monthly: 4000 }, months: { min: 2, max: 6 } }
  it('knows how each can be rented', () => {
    expect([rentsByDay(daily), rentsByMonth(daily)]).toEqual([true, false])
    expect([rentsByDay(monthly), rentsByMonth(monthly)]).toEqual([false, true])
    expect([rentsByDay(both), rentsByMonth(both)]).toEqual([true, true])
    // A monthly price without a month range is only a discount on long daily rentals.
    expect(rentsByMonth({ pricing: { daily: 200, monthly: 4000 } })).toBe(false)
  })
  it('leads with the daily price, or the monthly one', () => {
    expect(headlinePrice(both)).toEqual({ amount: 200, per: 'day' })
    expect(headlinePrice(monthly)).toEqual({ amount: 2400, per: 'month' })
    expect(dailyEquivalent(monthly)).toBe(80)
  })
})
