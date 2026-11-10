/**
 * Fee settings. These are placeholder values: change them here and every
 * price, quote and calculator (browser and server) follows.
 */
export const FEES = {
  /** Charged to the renter on the rent subtotal. */
  serviceFeePct: 8,
  /** GST charged on the service fee only (not on the rent or deposit). */
  gstOnFeePct: 18,
  /** Kept from the owner's rent. */
  ownerCommissionPct: 10,
  /** Days in a "month" for monthly pricing. */
  daysPerMonth: 30,
  daysPerWeek: 7,
} as const

export type Fees = typeof FEES
