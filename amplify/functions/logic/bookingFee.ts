/**
 * The booking fee (shared/policy.ts): the renter pays it online after the owner
 * accepts, through a Razorpay payment link (a hosted page; no Razorpay script on
 * our site). Off until the Razorpay keys are set; sandboxes use a test provider.
 * Refund rule (Refund Policy): refunded if the owner cancels or leaves; not if
 * the renter cancels after paying.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { BookingFee, FeeStatus } from '../../../shared/types'
import { RuleError, type StoredBooking } from './bookings'

export interface FeeProvider {
  mode: 'off' | 'test' | 'razorpay'
  /** A hosted payment page for this booking; the person comes back to `callbackUrl` with the result. */
  createLink(bookingId: string, amountRupees: number, callbackUrl: string): Promise<{ linkId: string; url: string }>
  /** Checks the signed result Razorpay sends back, and that the link really is paid. Returns the payment id, or null. */
  verify(params: Record<string, string>): Promise<string | null>
  refund(paymentId: string, amountRupees: number): Promise<void>
}

export interface FeeStore {
  getBooking(id: string): Promise<StoredBooking | null>
  setFee(id: string, fee: Partial<BookingFee> & { status: FeeStatus }): Promise<void>
  /** Bookings whose fee should be refunded. */
  listRefundsDue(): Promise<StoredBooking[]>
}

export async function startFeePayment(
  { store, provider, allowedReturn }: { store: FeeStore; provider: FeeProvider; allowedReturn: (url: string) => boolean },
  actorId: string,
  bookingId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  if (provider.mode === 'off') throw new RuleError('Online payments aren’t switched on yet.')
  const b = await store.getBooking(bookingId)
  if (!b || b.renterId !== actorId) throw new RuleError('Booking not found.')
  if (b.status !== 'accepted' || b.fee?.status !== 'due') throw new RuleError('There’s nothing to pay for this booking right now.')
  if (!allowedReturn(returnUrl)) throw new RuleError('Something went wrong. Please try again.')
  if (b.fee.linkUrl) return { url: b.fee.linkUrl }
  const { linkId, url } = await provider.createLink(b.id, b.fee.amount, returnUrl)
  await store.setFee(b.id, { status: 'due', linkId, linkUrl: url })
  return { url }
}

export async function confirmFeePayment({ store, provider, now }: { store: FeeStore; provider: FeeProvider; now: Date }, actorId: string, bookingId: string, params: Record<string, string>) {
  const b = await store.getBooking(bookingId)
  if (!b || b.renterId !== actorId) throw new RuleError('Booking not found.')
  if (b.fee?.status === 'paid') return { paid: true }
  if (b.fee?.status !== 'due' || !b.fee.linkId || params.razorpay_payment_link_id !== b.fee.linkId) throw new RuleError('That payment isn’t for this booking.')
  const paymentId = await provider.verify(params)
  if (!paymentId) throw new RuleError('The payment didn’t go through. Nothing was charged; try again from your dashboard.')
  await store.setFee(b.id, { status: 'paid', paymentId, paidAt: now.toISOString() })
  return { paid: true }
}

/** Hourly: refunds fees marked for refund (owner cancelled, or left). */
export async function processRefunds({ store, provider }: { store: FeeStore; provider: FeeProvider }): Promise<number> {
  if (provider.mode === 'off') return 0
  let done = 0
  for (const b of await store.listRefundsDue()) {
    if (!b.fee?.paymentId) continue
    await provider.refund(b.fee.paymentId, b.fee.amount)
    await store.setFee(b.id, { status: 'refunded' })
    done++
  }
  return done
}

const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Razorpay payment links (razorpay.com/docs/api/payments/payment-links). */
export function razorpayProvider(keyId: string, keySecret: string): FeeProvider {
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
  const call = async (method: 'GET' | 'POST', path: string, body?: object) => {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, { method, headers: { authorization: auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) throw new Error(`Razorpay ${method} ${path}: ${res.status}`)
    return json
  }
  return {
    mode: 'razorpay',
    async createLink(bookingId, amountRupees, callbackUrl) {
      const r = await call('POST', '/payment_links', {
        amount: amountRupees * 100,
        currency: 'INR',
        reference_id: bookingId.slice(0, 40),
        description: 'RentiGoo booking fee',
        callback_url: callbackUrl,
        callback_method: 'get',
        expire_by: Math.floor(Date.now() / 1000) + 3 * 86_400,
      })
      return { linkId: String(r.id), url: String(r.short_url) }
    },
    async verify(p) {
      const { razorpay_payment_id: pid, razorpay_payment_link_id: lid, razorpay_payment_link_reference_id: ref, razorpay_payment_link_status: status, razorpay_signature: sig } = p
      if (!pid || !lid || !sig || status !== 'paid') return null
      const expected = createHmac('sha256', keySecret).update(`${lid}|${ref ?? ''}|${status}|${pid}`).digest('hex')
      if (!safeEqual(expected, sig)) return null
      const link = await call('GET', `/payment_links/${encodeURIComponent(lid)}`)
      return link.status === 'paid' ? pid : null
    },
    async refund(paymentId, amountRupees) {
      await call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountRupees * 100 })
    },
  }
}

/** Sandboxes: no Razorpay. The "payment page" sends straight back as paid. */
export const testFeeProvider: FeeProvider = {
  mode: 'test',
  async createLink(bookingId, _amount, callbackUrl) {
    const linkId = `plink_test_${bookingId.slice(0, 12)}`
    const u = new URL(callbackUrl)
    for (const [k, v] of Object.entries({ razorpay_payment_id: `pay_test_${Date.now()}`, razorpay_payment_link_id: linkId, razorpay_payment_link_status: 'paid', razorpay_signature: 'test' })) {
      u.searchParams.set(k, v)
    }
    return { linkId, url: u.toString() }
  },
  async verify(p) {
    return p.razorpay_payment_link_status === 'paid' && p.razorpay_signature === 'test' ? (p.razorpay_payment_id ?? null) : null
  },
  async refund() {},
}

export const offFeeProvider: FeeProvider = {
  mode: 'off',
  createLink: () => Promise.reject(new RuleError('Online payments aren’t switched on yet.')),
  verify: () => Promise.resolve(null),
  refund: () => Promise.resolve(),
}
