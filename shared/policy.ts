/**
 * RentiGoo's prices and deposit rules, in one place. Change a number here and
 * the site, the listing form, the server checks, the Terms and the Refund
 * Policy all follow. (Rent fees for later online rent payments live in fees.ts.)
 */

export const POLICY = {
  /** Paid online by the renter after the owner accepts. Only charged once online payments are switched on (Razorpay keys set). */
  bookingFee: 49,
  /** Rental-shop plan, from this much a month. Not on sale yet: the site says "talk to us". */
  shopPlanFromPerMonth: 499,
  /** The owner must give the deposit back within this many hours of the return, unless they report damage with photos. */
  depositReturnHours: 24,
  /** Damage must be reported to RentiGoo within this many hours of the return. */
  damageReportHours: 24,
  /** If a renter's request isn't listed, we aim to find someone who has it within this many hours (request board). */
  requestReplyHours: 24,
} as const

/**
 * The most an owner may ask as a deposit, per category (about 12% of a typical
 * new price, rounded; approved 2026-11-18). Enforced by the listing form and the server.
 */
export const DEPOSIT_CAPS: Record<string, number> = {
  cameras: 10_000,
  electronics: 5_500,
  party: 3_000,
  tools: 1_000,
  outdoor: 2_000,
  furniture: 2_000,
  appliances: 3_500,
  music: 3_500,
  baby: 1_500,
  fitness: 4_000,
}

/** The deposit cap for a category (the general maximum if it has none). */
export const depositCap = (categoryId: string | undefined, fallback = 500_000) => (categoryId && DEPOSIT_CAPS[categoryId]) || fallback
