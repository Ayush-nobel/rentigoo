import { describe, expect, it } from 'vitest'
import { ownerStats, requestBooking, respondToBooking, RuleError, submitReview, type StoredListing } from './bookings'
import { FEES } from '../../../shared/fees'
import { memoryStore } from './memoryStore'
import { confirmFeePayment, offFeeProvider, processRefunds, startFeePayment, testFeeProvider } from './bookingFee'

const TODAY = '2026-11-10'
const listing: StoredListing = {
  id: 'tent',
  ownerId: 'owner',
  title: 'Tent',
  description: '',
  categoryId: 'outdoor',
  areaId: 'kolar-road',
  photos: [],
  condition: 'good',
  pricing: { daily: 300, weekly: 1500 },
  deposit: 2500,
  minDays: 1,
  maxDays: 30,
  pickupOptions: ['pickup'],
  blockedDates: ['2026-11-25'],
  bookedDates: [],
  rules: [],
  ratingAvg: 0,
  ratingCount: 0,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
}
const ask = (over = {}) => ({ listingId: 'tent', start: '2026-11-12', end: '2026-11-15', delivery: false, ...over })

describe('requestBooking', () => {
  it('creates a request priced on the server', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask({ message: '  For Pachmarhi  ' }), 'renter', TODAY)
    expect(b).toMatchObject({ status: 'requested', renterId: 'renter', ownerId: 'owner', participants: ['renter', 'owner'], message: 'For Pachmarhi' })
    expect(b.quote.rentalSubtotal).toBe(900)
    // rent 900 + service fee + GST on the fee + deposit 2500, at whatever the fee settings are
    const fee = Math.round((900 * FEES.serviceFeePct) / 100)
    expect(b.quote.totalDue).toBe(900 + fee + Math.round((fee * FEES.gstOnFeePct) / 100) + 2500)
  })

  it('refuses the owner, past dates and owner-blocked days', async () => {
    const { store } = memoryStore({ listings: [listing] })
    await expect(requestBooking(store, ask(), 'owner', TODAY)).rejects.toThrow(/own listing/)
    await expect(requestBooking(store, ask({ start: '2026-11-01' }), 'renter', TODAY)).rejects.toThrow(/passed/)
    await expect(requestBooking(store, ask({ start: '2026-11-24', end: '2026-11-27' }), 'renter', TODAY)).rejects.toThrow(/already booked/)
  })

  it('refuses dates taken by an accepted booking even if the calendar cache is stale', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const first = await requestBooking(store, ask(), 'renter', TODAY)
    await respondToBooking(store, first.id, 'accept', 'owner')
    await expect(requestBooking(store, ask({ start: '2026-11-14', end: '2026-11-16' }), 'renter2', TODAY)).rejects.toBeInstanceOf(RuleError)
  })

  it('refuses an identical duplicate request', async () => {
    const { store } = memoryStore({ listings: [listing] })
    await requestBooking(store, ask(), 'renter', TODAY)
    await expect(requestBooking(store, ask(), 'renter', TODAY)).rejects.toThrow(/already asked/)
  })
})

describe('respondToBooking', () => {
  it('accepting blocks the dates on the listing calendar', async () => {
    const { store, listings } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    const accepted = await respondToBooking(store, b.id, 'accept', 'owner')
    expect(accepted.status).toBe('accepted')
    expect(listings.get('tent')!.bookedDates).toEqual(['2026-11-12', '2026-11-13', '2026-11-14'])
  })

  it('only the owner can accept, and only once', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    await expect(respondToBooking(store, b.id, 'accept', 'renter')).rejects.toThrow(/can’t be changed/)
    await expect(respondToBooking(store, b.id, 'accept', 'stranger')).rejects.toThrow(/not found/)
    await respondToBooking(store, b.id, 'accept', 'owner')
    await expect(respondToBooking(store, b.id, 'accept', 'owner')).rejects.toThrow(/can’t be changed/)
  })

  it('refuses to accept two overlapping requests', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const a = await requestBooking(store, ask(), 'renter', TODAY)
    const b = await requestBooking(store, ask({ start: '2026-11-13', end: '2026-11-17' }), 'renter2', TODAY)
    await respondToBooking(store, a.id, 'accept', 'owner')
    await expect(respondToBooking(store, b.id, 'accept', 'owner')).rejects.toThrow(/no longer free/)
  })

  it('cancelling frees the dates again', async () => {
    const { store, listings } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    await respondToBooking(store, b.id, 'accept', 'owner')
    await respondToBooking(store, b.id, 'cancel', 'renter')
    expect(listings.get('tent')!.bookedDates).toEqual([])
  })

  it('handover then return completes and marks paid', async () => {
    const { store, listings } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    await respondToBooking(store, b.id, 'accept', 'owner')
    await respondToBooking(store, b.id, 'handover', 'owner')
    const done = await respondToBooking(store, b.id, 'return', 'owner')
    expect(done).toMatchObject({ status: 'completed', paymentStatus: 'paid' })
    expect(listings.get('tent')!.bookedDates).toEqual([])
  })
})

describe('submitReview', () => {
  async function completed() {
    const m = memoryStore({ listings: [listing] })
    const b = await requestBooking(m.store, ask(), 'renter', TODAY)
    for (const a of ['accept', 'handover', 'return'] as const) await respondToBooking(m.store, b.id, a, 'owner')
    return { ...m, bookingId: b.id }
  }

  it('only after the item is returned', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    await expect(submitReview(store, { bookingId: b.id, rating: 5, text: 'Lovely tent, stayed dry' }, 'renter')).rejects.toThrow(/returned/)
  })

  it('renter review updates listing and owner ratings', async () => {
    const { store, listings, userRatings, bookingId } = await completed()
    const r = await submitReview(store, { bookingId, rating: 4, text: 'Good tent, one bent peg' }, 'renter')
    expect(r).toMatchObject({ role: 'renter', targetUserId: 'owner', rating: 4 })
    expect(listings.get('tent')).toMatchObject({ ratingAvg: 4, ratingCount: 1 })
    expect(userRatings.get('owner')).toEqual({ avg: 4, count: 1 })
  })

  it('owner review rates the renter, not the listing', async () => {
    const { store, listings, userRatings, bookingId } = await completed()
    await submitReview(store, { bookingId, rating: 5, text: 'Returned clean and on time' }, 'owner')
    expect(listings.get('tent')!.ratingCount).toBe(0)
    expect(userRatings.get('renter')).toEqual({ avg: 5, count: 1 })
  })

  it('one review each, real ratings, real words, participants only', async () => {
    const { store, bookingId } = await completed()
    await expect(submitReview(store, { bookingId, rating: 6, text: 'Great great great' }, 'renter')).rejects.toThrow(/1 to 5/)
    await expect(submitReview(store, { bookingId, rating: 5, text: 'ok' }, 'renter')).rejects.toThrow(/few words/)
    await expect(submitReview(store, { bookingId, rating: 5, text: 'Not my booking at all' }, 'stranger')).rejects.toThrow(/not found/)
    await submitReview(store, { bookingId, rating: 5, text: 'Stayed dry all night' }, 'renter')
    await expect(submitReview(store, { bookingId, rating: 5, text: 'Trying to review twice' }, 'renter')).rejects.toThrow(/already reviewed/)
  })
})

describe('ownerStats', () => {
  it('sums completed payouts and counts open bookings', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const done = await requestBooking(store, ask(), 'renter', TODAY)
    for (const a of ['accept', 'handover', 'return'] as const) await respondToBooking(store, done.id, a, 'owner')
    await requestBooking(store, ask({ start: '2026-11-20', end: '2026-11-22' }), 'renter2', TODAY)
    const s = await ownerStats(store, 'owner', '2026-11')
    const earned = 900 - Math.round((900 * FEES.ownerCommissionPct) / 100) // rent after commission
    expect(s).toEqual({ earnedThisMonth: earned, earnedTotal: earned, pendingRequests: 1, activeRentals: 0, upcomingRentals: 0 })
  })
})

describe('monthly rentals', () => {
  const sofa: StoredListing = { ...listing, id: 'sofa', title: 'Sofa', pricing: { monthly: 2500 }, months: { min: 2, max: 12 }, deposit: 5000, blockedDates: [] }
  const askMonths = (over = {}) => ({ listingId: 'sofa', start: '2026-12-01', end: '', delivery: false, months: 6, ...over })

  async function running() {
    const m = memoryStore({ listings: [sofa] })
    const b = await requestBooking(m.store, askMonths(), 'renter', TODAY)
    await respondToBooking(m.store, b.id, 'accept', 'owner')
    await respondToBooking(m.store, b.id, 'handover', 'owner')
    return { ...m, id: b.id }
  }

  it('prices by the month and works out the end date', async () => {
    const { store } = memoryStore({ listings: [sofa] })
    const b = await requestBooking(store, askMonths(), 'renter', TODAY)
    expect(b).toMatchObject({ start: '2026-12-01', end: '2027-06-01', paidMonths: 0 })
    expect(b.quote).toMatchObject({ term: 'months', months: 6, monthlyRate: 2500, totalRent: 15000, dueAtPickup: 7500 })
  })

  it('checks the month range and refuses day bookings on a monthly-only listing', async () => {
    const { store } = memoryStore({ listings: [sofa] })
    await expect(requestBooking(store, askMonths({ months: 1 }), 'renter', TODAY)).rejects.toThrow(/at least 2 months/)
    await expect(requestBooking(store, askMonths({ months: 13 }), 'renter', TODAY)).rejects.toThrow(/up to 12 months/)
    await expect(requestBooking(store, { listingId: 'sofa', start: '2026-12-01', end: '2026-12-04', delivery: false }, 'renter', TODAY)).rejects.toThrow(/by the month/)
  })

  it('blocks every day of the rental once accepted', async () => {
    const { listings } = await running()
    const booked = listings.get('sofa')!.bookedDates
    expect(booked[0]).toBe('2026-12-01')
    expect(booked.at(-1)).toBe('2027-05-31')
  })

  it('owner marks months paid in order; renter can’t; not past the last month', async () => {
    const m = await running()
    await expect(respondToBooking(m.store, m.id, 'markPaid', 'renter')).rejects.toThrow(/Only the owner/)
    for (let i = 1; i <= 6; i++) expect((await respondToBooking(m.store, m.id, 'markPaid', 'owner')).paidMonths).toBe(i)
    await expect(respondToBooking(m.store, m.id, 'markPaid', 'owner')).rejects.toThrow(/already marked/)
  })

  it('notice ends it a month later, frees the days after, and only once', async () => {
    const m = await running()
    const b = await respondToBooking(m.store, m.id, 'giveNotice', 'renter', '2027-01-10')
    expect(b.end).toBe('2027-02-10')
    expect(b.notice?.by).toBe('renter')
    expect(m.listings.get('sofa')!.bookedDates.at(-1)).toBe('2027-02-09')
    await expect(respondToBooking(m.store, m.id, 'giveNotice', 'owner', '2027-01-11')).rejects.toThrow(/already been given/)
  })

  it('earnings count each month once it’s marked paid', async () => {
    const m = await running()
    await respondToBooking(m.store, m.id, 'markPaid', 'owner')
    await respondToBooking(m.store, m.id, 'markPaid', 'owner')
    const s = await ownerStats(m.store, 'owner', '2027-01')
    expect(s).toMatchObject({ earnedTotal: 5000, earnedThisMonth: 2500, activeRentals: 1 })
  })

  it('notice and payments are only for monthly rentals that are under way', async () => {
    const { store } = memoryStore({ listings: [listing] })
    const b = await requestBooking(store, ask(), 'renter', TODAY)
    await expect(respondToBooking(store, b.id, 'giveNotice', 'renter', TODAY)).rejects.toThrow(/can’t be changed/)
  })
})

describe('booking fee', () => {
  const NOW = new Date('2026-11-10T10:00:00Z')
  const back = 'https://www.rentigoo.in/booking-fee'
  const allowedReturn = (u: string) => u.startsWith(back)

  async function accepted(fee: number | null = 49) {
    const m = memoryStore({ listings: [listing] })
    const b = await requestBooking(m.store, ask(), 'renter', TODAY)
    await respondToBooking(m.store, b.id, 'accept', 'owner', TODAY, { bookingFee: fee ?? undefined })
    const feeStore = { getBooking: m.store.getBooking, setFee: m.store.setBookingFee, listRefundsDue: async () => [...m.bookings.values()].filter((x) => x.fee?.status === 'refund_due') }
    return { m, id: b.id, feeStore }
  }

  it('is due once the owner accepts, and blocks handover until paid', async () => {
    const { m, id, feeStore } = await accepted()
    expect((await m.store.getBooking(id))!.fee).toMatchObject({ status: 'due', amount: 49 })
    await expect(respondToBooking(m.store, id, 'handover', 'owner', TODAY)).rejects.toThrow(/pay the booking fee/)
    const { url } = await startFeePayment({ store: feeStore, provider: testFeeProvider, allowedReturn }, 'renter', id, back)
    const params = Object.fromEntries(new URL(url).searchParams)
    expect(await confirmFeePayment({ store: feeStore, provider: testFeeProvider, now: NOW }, 'renter', id, params)).toEqual({ paid: true })
    expect((await m.store.getBooking(id))!.fee?.status).toBe('paid')
    expect((await respondToBooking(m.store, id, 'handover', 'owner', TODAY)).status).toBe('active')
  })

  it('is never charged while online payments are off', async () => {
    const { m, id, feeStore } = await accepted(null)
    expect((await m.store.getBooking(id))!.fee ?? null).toBeNull()
    expect((await respondToBooking(m.store, id, 'handover', 'owner', TODAY)).status).toBe('active')
    await expect(startFeePayment({ store: feeStore, provider: offFeeProvider, allowedReturn }, 'renter', id, back)).rejects.toThrow(/switched on/)
  })

  it('only the renter pays, only back to our site, and a forged result is refused', async () => {
    const { id, feeStore } = await accepted()
    await expect(startFeePayment({ store: feeStore, provider: testFeeProvider, allowedReturn }, 'owner', id, back)).rejects.toThrow(/not found/)
    await expect(startFeePayment({ store: feeStore, provider: testFeeProvider, allowedReturn }, 'renter', id, 'https://evil.example/booking-fee')).rejects.toThrow()
    const { url } = await startFeePayment({ store: feeStore, provider: testFeeProvider, allowedReturn }, 'renter', id, back)
    const forged = { ...Object.fromEntries(new URL(url).searchParams), razorpay_signature: 'forged' }
    await expect(confirmFeePayment({ store: feeStore, provider: testFeeProvider, now: NOW }, 'renter', id, forged)).rejects.toThrow(/didn’t go through/)
  })

  it('is refunded when the owner cancels after it’s paid, not when the renter does', async () => {
    for (const who of ['owner', 'renter'] as const) {
      const { m, id, feeStore } = await accepted()
      const { url } = await startFeePayment({ store: feeStore, provider: testFeeProvider, allowedReturn }, 'renter', id, back)
      await confirmFeePayment({ store: feeStore, provider: testFeeProvider, now: NOW }, 'renter', id, Object.fromEntries(new URL(url).searchParams))
      await respondToBooking(m.store, id, 'cancel', who, TODAY)
      const refunded = await processRefunds({ store: feeStore, provider: testFeeProvider })
      expect([who, refunded, (await m.store.getBooking(id))!.fee?.status]).toEqual(who === 'owner' ? ['owner', 1, 'refunded'] : ['renter', 0, 'paid'])
    }
  })
})
