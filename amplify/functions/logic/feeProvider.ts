import { offFeeProvider, razorpayProvider, testFeeProvider, type FeeProvider } from './bookingFee'

/** The fee provider for this backend (BOOKING_FEE_MODE is set in backend.ts). */
export function feeProvider(): FeeProvider {
  const mode = process.env.BOOKING_FEE_MODE
  if (mode === 'razorpay') return razorpayProvider(process.env.RAZORPAY_KEY_ID ?? '', process.env.RAZORPAY_KEY_SECRET ?? '')
  if (mode === 'test') return testFeeProvider
  return offFeeProvider
}

/** Only back to our own site's booking-fee page (or a local copy in a sandbox). */
export function allowedReturn(path: string) {
  const origins = (process.env.RETURN_ORIGINS ?? '').split(',').filter(Boolean)
  return (url: string) => {
    try {
      const u = new URL(url)
      return u.pathname === path && origins.some((o) => (o.endsWith(':*') ? `${u.protocol}//${u.hostname}:*` === o : u.origin === o))
    } catch {
      return false
    }
  }
}
