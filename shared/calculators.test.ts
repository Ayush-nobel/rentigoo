import { describe, expect, it } from 'vitest'
import { ownerEarnings, rentVsBuy } from './calculators'

describe('rentVsBuy', () => {
  const base = { purchasePrice: 80000, resalePct: 50, upkeepPerYear: 2000, years: 2, dailyRate: 1000, daysPerYear: 10 }

  it('compares buying and renting', () => {
    const r = rentVsBuy(base)
    // buy: 80000 − 40000 + 4000 = 44000
    expect(r.buyCost).toBe(44000)
    // rent per day: 1000 × (1 + 0.08 × 1.18) = 1094.4 → 20 days = 21888
    expect(r.rentCost).toBe(21888)
    expect(r.cheaper).toBe('rent')
    expect(r.savings).toBe(44000 - 21888)
    // 44000 / (1094.4 × 2) = 20.1 → 20
    expect(r.breakEvenDaysPerYear).toBe(20)
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
    const r = ownerEarnings({ dailyRate: 900, daysPerMonth: 8, itemValue: 85000 })
    expect(r.grossMonthly).toBe(7200)
    expect(r.commissionMonthly).toBe(720)
    expect(r.netMonthly).toBe(6480)
    expect(r.netYearly).toBe(77760)
    expect(r.monthsToPayBack).toBe(13.2)
  })

  it('returns null pay-back when nothing is rented', () => {
    expect(ownerEarnings({ dailyRate: 900, daysPerMonth: 0, itemValue: 85000 }).monthsToPayBack).toBeNull()
  })

  it('caps days at a month', () => {
    expect(ownerEarnings({ dailyRate: 100, daysPerMonth: 45, itemValue: 0 }).grossMonthly).toBe(3000)
  })
})
