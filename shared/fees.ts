/**
 * Fee settings. These are placeholder values: change them here and every
 * price, quote and calculator (browser and server) follows.
 */
export interface Fees {
  serviceFeePct: number
  gstOnFeePct: number
  ownerCommissionPct: number
  daysPerMonth: number
  daysPerWeek: number
}

export const FEES: Readonly<Fees> = {
  /** Charged to the renter on the rent subtotal. */
  serviceFeePct: 8,
  /**
   * GST on the service fee only (not on the rent or deposit). RentiGoo is not
   * GST-registered, so it must not charge GST: 0 until there is a GSTIN, then 18.
   */
  gstOnFeePct: 0,
  /** Kept from the owner's rent. */
  ownerCommissionPct: 10,
  /** Days in a "month" for monthly pricing. */
  daysPerMonth: 30,
  daysPerWeek: 7,
}
