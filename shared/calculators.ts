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

export interface RentVsBuyMonthlyInput {
  purchasePrice: number
  /** Share of the price you'd get back selling it at the end, 0–100. */
  resalePct: number
  upkeepPerYear: number
  monthlyRate: number
  /** How many months you need it. */
  months: number
}

export interface RentVsBuyMonthlyResult {
  buyCost: number
  rentCost: number
  savings: number
  cheaper: 'rent' | 'buy' | 'same'
  /**
   * Months after which buying works out cheaper (for a stay longer than this,
   * buy). Null when renting always wins, e.g. upkeep costs more than the rent.
   */
  breakEvenMonths: number | null
}

/** Renting by the month vs buying it and selling it again when you're done. */
export function rentVsBuyMonthly(input: RentVsBuyMonthlyInput, fees: Fees = FEES): RentVsBuyMonthlyResult {
  const price = safe(input.purchasePrice)
  const resale = clamp(safe(input.resalePct), 0, 100)
  const months = Math.max(1, Math.round(safe(input.months)))
  const upkeepMonthly = safe(input.upkeepPerYear) / 12
  const loss = price - (price * resale) / 100
  const buyCost = Math.round(loss + upkeepMonthly * months)

  const feeMultiplier = 1 + (fees.serviceFeePct / 100) * (1 + fees.gstOnFeePct / 100)
  const rentPerMonth = safe(input.monthlyRate) * feeMultiplier
  const rentCost = Math.round(rentPerMonth * months)
  const savings = buyCost - rentCost

  // Buying costs `loss` once plus upkeep each month; renting costs the rent each month.
  const gap = rentPerMonth - upkeepMonthly
  const breakEvenMonths = gap > 0 ? Math.floor(loss / gap) : null

  return { buyCost, rentCost, savings, cheaper: savings > 0 ? 'rent' : savings < 0 ? 'buy' : 'same', breakEvenMonths }
}

export interface MonthlyEarningsInput {
  monthlyRate: number
  /** Months a year it's rented out, 0–12. */
  monthsPerYear: number
  itemValue: number
}

/** An owner renting by the month: the yearly total, and the average per month. */
export function ownerEarningsMonthly(input: MonthlyEarningsInput, fees: Fees = FEES): EarningsResult {
  const months = clamp(Math.round(safe(input.monthsPerYear)), 0, 12)
  const grossYearly = safe(input.monthlyRate) * months
  const commissionYearly = Math.round((grossYearly * fees.ownerCommissionPct) / 100)
  const netYearly = Math.round(grossYearly - commissionYearly)
  const netMonthly = Math.round(netYearly / 12)
  const value = safe(input.itemValue)
  // Pay-back counts the months it's actually rented.
  const perRentedMonth = months ? netYearly / months : 0
  return {
    grossMonthly: Math.round(grossYearly / 12),
    commissionMonthly: Math.round(commissionYearly / 12),
    netMonthly,
    netYearly,
    monthsToPayBack: perRentedMonth > 0 && value > 0 ? Math.ceil((value / perRentedMonth) * 10) / 10 : null,
  }
}
