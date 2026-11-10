import { describe, expect, it } from 'vitest'
import { REDACTED_MESSAGE, deleteMyAccount } from './account'
import { requestBooking, respondToBooking, submitReview, type StoredListing } from './bookings'
import { memoryStore } from './memoryStore'

const TODAY = '2026-11-10'
const listing = (id: string, ownerId: string): StoredListing => ({
  id,
  ownerId,
  title: id,
  description: '',
  categoryId: 'outdoor',
  areaId: 'kolar-road',
  photos: [],
  condition: 'good',
  pricing: { daily: 300 },
  deposit: 0,
  minDays: 1,
  maxDays: 30,
  pickupOptions: ['pickup'],
  blockedDates: [],
  bookedDates: [],
  rules: [],
  ratingAvg: 0,
  ratingCount: 0,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
})

async function world() {
  // "meera" owns a tent and rents vikram's stove; vikram owns the stove and rents meera's tent.
  const m = memoryStore({
    listings: [listing('tent', 'meera'), listing('stove', 'vikram')],
    messages: [
      { id: 'm1', senderId: 'meera', text: 'Is Saturday ok?' },
      { id: 'm2', senderId: 'vikram', text: 'Yes!' },
    ],
    profiles: ['meera', 'vikram'],
  })
  const ask = (listingId: string, renter: string, start: string, end: string, message?: string) =>
    requestBooking(m.store, { listingId, start, end, delivery: false, message }, renter, TODAY)
  // A finished rental with reviews both ways: meera rented the stove.
  const done = await ask('stove', 'meera', '2026-11-12', '2026-11-13', 'For Pachmarhi')
  for (const a of ['accept', 'handover', 'return'] as const) await respondToBooking(m.store, done.id, a, 'vikram')
  await submitReview(m.store, { bookingId: done.id, rating: 5, text: 'Great little stove' }, 'meera')
  await submitReview(m.store, { bookingId: done.id, rating: 4, text: 'Returned it clean' }, 'vikram')
  // An accepted future booking: vikram rents meera's tent.
  const upcoming = await ask('tent', 'vikram', '2026-11-20', '2026-11-22')
  await respondToBooking(m.store, upcoming.id, 'accept', 'meera')
  // An open request from meera for the stove.
  const pending = await ask('stove', 'meera', '2026-11-25', '2026-11-26')
  return { ...m, done, upcoming, pending }
}

describe('deleteMyAccount', () => {
  it('removes personal data and keeps a minimal booking record', async () => {
    const w = await world()
    const summary = await deleteMyAccount(w.store, 'meera')
    expect(summary).toEqual({ cancelledBookings: 2, deletedListings: 1, deletedReviews: 2, redactedMessages: 1 })
    expect(w.listings.has('tent')).toBe(false)
    expect(w.reviews).toHaveLength(0)
    expect(w.profiles.has('meera')).toBe(false)
    expect(w.logins.has('meera')).toBe(false)
    expect(w.messages.find((x) => x.id === 'm1')!.text).toBe(REDACTED_MESSAGE)
    expect(w.messages.find((x) => x.id === 'm2')!.text).toBe('Yes!')
    const kept = w.bookings.get(w.done.id)!
    expect(kept.status).toBe('completed')
    expect(kept.message).toBeUndefined()
    expect(w.bookings.get(w.pending.id)!.status).toBe('cancelled')
  })

  it('fixes the other person’s ratings', async () => {
    const w = await world()
    await deleteMyAccount(w.store, 'meera')
    expect(w.listings.get('stove')).toMatchObject({ ratingAvg: 0, ratingCount: 0 })
    expect(w.userRatings.get('vikram')).toEqual({ avg: 0, count: 0 })
  })

  it('frees calendar dates on other people’s listings', async () => {
    const w = await world()
    const accepted = await requestBooking(w.store, { listingId: 'stove', start: '2026-12-01', end: '2026-12-03', delivery: false }, 'meera', TODAY)
    await respondToBooking(w.store, accepted.id, 'accept', 'vikram')
    expect(w.listings.get('stove')!.bookedDates).toContain('2026-12-01')
    await deleteMyAccount(w.store, 'meera')
    expect(w.listings.get('stove')!.bookedDates).toEqual([])
  })

  it('waits while an item is out', async () => {
    const w = await world()
    await respondToBooking(w.store, w.upcoming.id, 'handover', 'meera')
    await expect(deleteMyAccount(w.store, 'meera')).rejects.toThrow(/rental in progress/)
    expect(w.profiles.has('meera')).toBe(true)
  })

  it('is safe to run twice', async () => {
    const w = await world()
    await deleteMyAccount(w.store, 'meera')
    await expect(deleteMyAccount(w.store, 'meera')).resolves.toMatchObject({ deletedListings: 0 })
  })
})
