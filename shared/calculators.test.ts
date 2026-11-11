import { describe, expect, it } from 'vitest'
import { ownerEarnings, ownerEarningsMonthly, rentVsBuy, rentVsBuyMonthly } from './calculators'
import { FEES } from './fees'

const PLANNED = { ...FEES, serviceFeePct: 8, ownerCommissionPct: 10, gstOnFeePct: 0 }
const WITH_GST = { ...PLANNED, gstOnFeePct: 18 }

describe('rentVsBuy', () => {
  const base = { purchasePrice: 80000, resalePct: 50, upkeepPerYear: 2000, years: 2, dailyRate: 1000, daysPerYear: 10 }

  it('compares buying and renting', () => {
    const r = rentVsBuy(base, WITH_GST)
    // buy: 80000 − 40000 + 4000 = 44000
    expect(r.buyCost).toBe(44000)
    // rent per day: 1000 × (1 + 0.08 × 1.18) = 1094.4 → 20 days = 21888
    expect(r.rentCost).toBe(21888)
    expect(r.cheaper).toBe('rent')
    expect(r.savings).toBe(44000 - 21888)
    // 44000 / (1094.4 × 2) = 20.1 → 20
    expect(r.breakEvenDaysPerYear).toBe(20)
  })

  it('planned fee without GST: a rented day costs rate × 1.08', () => {
    expect(rentVsBuy(base, PLANNED).rentCostPerDay).toBe(1080)
  })

  it('current settings (no fees): a rented day costs the daily rate', () => {
    expect(rentVsBuy(base).rentCostPerDay).toBe(1000)
  })

  it('says buy when you use it a lot', () => {
    expect(rentVsBuy({ ...base, daysPerYear: 100 }).cheaper).toBe('buy')
  })

  it('handles empty or silly input without NaN', () => {
    const r = rentVsBuy({ purchasePrice: NaN, resalePct: 150, upkeepPerYear: -5, years: 0, dailyRate: 0, daysPerYear: 0 })
    expect(r.buyCost).toBe(0)
    expect(r.rentCost).toBe(0)
    expect(r.breakEvenDaysPerYear).toBe(0)
  })
})

describe('ownerEarnings', () => {
  it('takes commission off the gross', () => {
    const r = ownerEarnings({ dailyRate: 900, daysPerMonth: 8, itemValue: 85000 }, PLANNED)
    expect(r.grossMonthly).toBe(7200)
    expect(r.commissionMonthly).toBe(720)
    expect(r.netMonthly).toBe(6480)
    expect(r.netYearly).toBe(77760)
    expect(r.monthsToPayBack).toBe(13.2)
  })

  it('current settings: no commission, owner keeps it all', () => {
    expect(ownerEarnings({ dailyRate: 900, daysPerMonth: 8, itemValue: 85000 })).toMatchObject({ grossMonthly: 7200, commissionMonthly: 0, netMonthly: 7200 })
  })

  it('returns null pay-back when nothing is rented', () => {
    expect(ownerEarnings({ dailyRate: 900, daysPerMonth: 0, itemValue: 85000 }).monthsToPayBack).toBeNull()
  })

  it('caps days at a month', () => {
    expect(ownerEarnings({ dailyRate: 100, daysPerMonth: 45, itemValue: 0 }).grossMonthly).toBe(3000)
  })
})

describe('rentVsBuyMonthly', () => {
  // A ₹18,000 sofa, sold for 40% after, ₹600 a year upkeep, vs ₹1,200 a month.
  const base = { purchasePrice: 18000, resalePct: 40, upkeepPerYear: 600, monthlyRate: 1200, months: 6 }

  it('renting wins for a short stay', () => {
    const r = rentVsBuyMonthly(base)
    // buy: 18000 − 7200 + 50 × 6 = 11100; rent: 7200
    expect(r).toMatchObject({ buyCost: 11100, rentCost: 7200, savings: 3900, cheaper: 'rent' })
    // loss 10800 / (1200 − 50) = 9.39 → 9 months
    expect(r.breakEvenMonths).toBe(9)
  })

  it('buying wins past the break-even', () => {
    expect(rentVsBuyMonthly({ ...base, months: 12 }).cheaper).toBe('buy')
  })

  it('includes fees when they exist', () => {
    expect(rentVsBuyMonthly(base, PLANNED).rentCost).toBe(Math.round(1200 * 1.08 * 6))
  })

  it('renting always wins when upkeep costs more than the rent', () => {
    expect(rentVsBuyMonthly({ ...base, upkeepPerYear: 24000 }).breakEvenMonths).toBeNull()
  })

  it('handles empty input without NaN', () => {
    const r = rentVsBuyMonthly({ purchasePrice: NaN, resalePct: -1, upkeepPerYear: NaN, monthlyRate: 0, months: 0 })
    expect([r.buyCost, r.rentCost, r.breakEvenMonths]).toEqual([0, 0, null])
  })
})

describe('ownerEarningsMonthly', () => {
  it('averages a year of monthly rentals', () => {
    const r = ownerEarningsMonthly({ monthlyRate: 1500, monthsPerYear: 8, itemValue: 30000 })
    expect(r).toMatchObject({ netYearly: 12000, netMonthly: 1000, monthsToPayBack: 20 })
  })
  it('takes commission when there is one', () => {
    expect(ownerEarningsMonthly({ monthlyRate: 1000, monthsPerYear: 12, itemValue: 0 }, PLANNED)).toMatchObject({ netYearly: 10800, netMonthly: 900, monthsToPayBack: null })
  })
  it('nothing rented, nothing earned', () => {
    expect(ownerEarningsMonthly({ monthlyRate: 1500, monthsPerYear: 0, itemValue: 30000 })).toMatchObject({ netYearly: 0, monthsToPayBack: null })
  })
})
