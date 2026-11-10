import { describe, expect, it } from 'vitest'
import { ownerStats, requestBooking, respondToBooking, RuleError, submitReview, type StoredListing } from './bookings'
import { FEES } from '../../../shared/fees'
import { memoryStore } from './memoryStore'

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
    // rent 900 + 8% fee 72 + GST on the fee (0 while not GST-registered) + deposit 2500
    expect(b.quote.totalDue).toBe(900 + 72 + Math.round((72 * FEES.gstOnFeePct) / 100) + 2500)
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
    expect(s).toEqual({ earnedThisMonth: 810, earnedTotal: 810, pendingRequests: 1, activeRentals: 0, upcomingRentals: 0 })
  })
})
