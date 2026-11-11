/** Phone checks send real texts (production with DLT IDs). Public pages describe them only then. */
export const PHONE_CHECK_LIVE: boolean = typeof __PHONE_CHECK_LIVE__ !== 'undefined' && __PHONE_CHECK_LIVE__
