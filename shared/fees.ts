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
  /**
   * Charged to the renter on the rent subtotal. 0 while payments happen at
   * pickup (RentiGoo never receives money, so it can't collect a fee). Planned: 8
   * once online payments exist; update the Terms before changing it.
   */
  serviceFeePct: 0,
  /**
   * GST on the service fee only (not on the rent or deposit). RentiGoo is not
   * GST-registered, so it must not charge GST: 0 until there is a GSTIN, then 18.
   */
  gstOnFeePct: 0,
  /** Kept from the owner's rent. 0 for the same reason as the service fee. Planned: 10. */
  ownerCommissionPct: 0,
  /** Days in a "month" for monthly pricing. */
  daysPerMonth: 30,
  daysPerWeek: 7,
}
