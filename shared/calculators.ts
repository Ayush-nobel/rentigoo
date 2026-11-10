import { FEES, type Fees } from './fees'

export interface RentVsBuyInput {
  purchasePrice: number
  /** Share of the price you'd get back by selling at the end, 0–100. */
  resalePct: number
  upkeepPerYear: number
  years: number
  /** Owner's daily rate (before RentiGoo's renter fee). */
  dailyRate: number
  daysPerYear: number
}

export interface RentVsBuyResult {
  buyCost: number
  rentCost: number
  /** Cost of one rented day including service fee and GST. */
  rentCostPerDay: number
  /** Positive when renting is cheaper. */
  savings: number
  cheaper: 'rent' | 'buy' | 'same'
  /** Days per year at which buying and renting cost the same. */
  breakEvenDaysPerYear: number
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export function rentVsBuy(input: RentVsBuyInput, fees: Fees = FEES): RentVsBuyResult {
  const price = safe(input.purchasePrice)
  const resale = clamp(safe(input.resalePct), 0, 100)
  const years = Math.max(1, safe(input.years))
  const buyCost = Math.round(price - (price * resale) / 100 + safe(input.upkeepPerYear) * years)

  const feeMultiplier = 1 + (fees.serviceFeePct / 100) * (1 + fees.gstOnFeePct / 100)
  const rentCostPerDay = safe(input.dailyRate) * feeMultiplier
  const rentCost = Math.round(rentCostPerDay * safe(input.daysPerYear) * years)

  const savings = buyCost - rentCost
  const breakEvenDaysPerYear = rentCostPerDay > 0 ? Math.floor(buyCost / (rentCostPerDay * years)) : 0

  return {
    buyCost,
    rentCost,
    rentCostPerDay: Math.round(rentCostPerDay),
    savings,
    cheaper: savings > 0 ? 'rent' : savings < 0 ? 'buy' : 'same',
    breakEvenDaysPerYear,
  }
}

export interface EarningsInput {
  dailyRate: number
  /** Days rented out per month, 0–30. */
  daysPerMonth: number
  itemValue: number
}

export interface EarningsResult {
  grossMonthly: number
  commissionMonthly: number
  netMonthly: number
  netYearly: number
  /** Months of renting to earn back the item's value; null if it never would. */
  monthsToPayBack: number | null
}

export function ownerEarnings(input: EarningsInput, fees: Fees = FEES): EarningsResult {
  const days = clamp(safe(input.daysPerMonth), 0, fees.daysPerMonth)
  const grossMonthly = Math.round(safe(input.dailyRate) * days)
  const commissionMonthly = Math.round((grossMonthly * fees.ownerCommissionPct) / 100)
  const netMonthly = grossMonthly - commissionMonthly
  const value = safe(input.itemValue)

  return {
    grossMonthly,
    commissionMonthly,
    netMonthly,
    netYearly: netMonthly * 12,
    monthsToPayBack: netMonthly > 0 && value > 0 ? Math.ceil((value / netMonthly) * 10) / 10 : null,
  }
}
