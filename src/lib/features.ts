/** Phone checks send real texts (production with DLT IDs). Public pages describe them only then. */
export const PHONE_CHECK_LIVE: boolean = typeof __PHONE_CHECK_LIVE__ !== 'undefined' && __PHONE_CHECK_LIVE__

/** ID checks through DigiLocker are switched on (production with Setu keys). Public pages describe them only then. */
export const ID_CHECK_LIVE: boolean = typeof __ID_CHECK_LIVE__ !== 'undefined' && __ID_CHECK_LIVE__

/** The booking fee is charged online (production with Razorpay keys). Until then, booking is free and pages say so. */
export const BOOKING_FEE_LIVE: boolean = typeof __BOOKING_FEE_LIVE__ !== 'undefined' && __BOOKING_FEE_LIVE__
