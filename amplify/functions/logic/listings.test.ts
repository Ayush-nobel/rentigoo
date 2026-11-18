import { describe, expect, it } from 'vitest'
import { deleteMyListing, saveListing } from './listings'
import { requestBooking, respondToBooking } from './bookings'
import { memoryStore } from './memoryStore'
import { deleteMyAccount } from './account'

const TODAY = '2026-11-10'
const folder = 'listing-photos/owner'
const key = (n: number) => `${folder}/7c9e6679-7425-40de-944b-e07fc1f90ae${n}.webp`
const listing = {
  title: 'Two-person tent',
  description: 'Waterproof dome tent, sleeps two. Pegs, poles and a carry bag included.',
  categoryId: 'outdoor',
  areaId: 'kolar-road',
  photos: [{ key: key(1), alt: 'Green dome tent pitched on grass' }],
  condition: 'good',
  pricing: { daily: 300 },
  deposit: 1500,
  minDays: 1,
  maxDays: 10,
  pickupOptions: ['pickup'],
  blockedDates: [],
  rules: [],
  status: 'active',
}

describe('saveListing', () => {
  it('creates a listing owned by the caller, ignoring fields the owner may not set', async () => {
    const { store } = memoryStore()
    const saved = await saveListing(store, { listing: { ...listing, ownerId: 'someone-else', ratingAvg: 5, ratingCount: 99 } }, 'owner', TODAY)
    expect(saved).toMatchObject({ ownerId: 'owner', ratingAvg: 0, ratingCount: 0, title: 'Two-person tent' })
  })

  it('refuses an incomplete listing with the reason', async () => {
    const { store } = memoryStore()
    await expect(saveListing(store, { listing: { ...listing, photos: [] } }, 'owner', TODAY)).rejects.toThrow(/at least one photo/)
  })

  it('lets only the owner edit, and accepts a status-only change', async () => {
    const { store } = memoryStore()
    const saved = await saveListing(store, { listing }, 'owner', TODAY)
    await expect(saveListing(store, { id: saved.id, listing: { status: 'paused' } }, 'stranger', TODAY)).rejects.toThrow(/wasn’t found/)
    const paused = await saveListing(store, { id: saved.id, listing: { status: 'paused' } }, 'owner', TODAY)
    expect(paused).toMatchObject({ status: 'paused', title: 'Two-person tent' })
  })

  it('keeps booked days and ratings when the owner edits', async () => {
    const m = memoryStore()
    const saved = await saveListing(m.store, { listing }, 'owner', TODAY)
    Object.assign(m.listings.get(saved.id)!, { bookedDates: ['2026-11-20'], ratingAvg: 4.5, ratingCount: 2 })
    const edited = await saveListing(m.store, { id: saved.id, listing: { ...listing, title: 'Two-person dome tent', bookedDates: [] } }, 'owner', TODAY)
    expect(edited).toMatchObject({ title: 'Two-person dome tent', bookedDates: ['2026-11-20'], ratingAvg: 4.5, ratingCount: 2 })
  })

  it('deletes photo files taken off the listing', async () => {
    const m = memoryStore()
    const saved = await saveListing(m.store, { listing: { ...listing, photos: [{ key: key(1), alt: 'Tent' }, { key: key(2), alt: 'Bag' }] } }, 'owner', TODAY)
    await saveListing(m.store, { id: saved.id, listing: { photos: [{ key: key(2), alt: 'Bag' }] } }, 'owner', TODAY)
    expect(m.deletedPhotos).toEqual([key(1)])
  })

  it('deleting the account deletes the photo folder too', async () => {
    const m = memoryStore({ profiles: ['owner'] })
    await saveListing(m.store, { listing }, 'owner', TODAY)
    await deleteMyAccount(m.store, 'owner')
    expect(m.forgottenPhones).toEqual(['owner'])
    expect(m.deletedPhotos).toEqual([`${folder}/`])
    expect(m.listings.size).toBe(0)
  })

  // Security review finding 1: nobody can get the server to delete someone else's photos.
  const victimKey = 'listing-photos/victim/7c9e6679-7425-40de-944b-e07fc1f90ae9.webp'

  it('refuses a photo from someone else’s folder', async () => {
    const { store } = memoryStore()
    await expect(saveListing(store, { listing: { ...listing, photos: [{ key: victimKey, alt: 'Their camera' }] } }, 'attacker', TODAY)).rejects.toThrow(/didn’t upload properly/)
  })

  it('never deletes someone else’s photo, even one already on the listing', async () => {
    const m = memoryStore({ profiles: ['attacker'] })
    // A listing saved before photos were tied to their owner, pointing at the victim's photo.
    const old = await m.store.createListing({ ...(listing as never), ownerId: 'attacker', photos: [{ key: victimKey, alt: 'Their camera' }, { key: 'listing-photos/attacker/7c9e6679-7425-40de-944b-e07fc1f90ae1.webp', alt: 'Mine' }] })
    await saveListing(m.store, { id: old.id, listing: { photos: [{ key: 'listing-photos/attacker/7c9e6679-7425-40de-944b-e07fc1f90ae1.webp', alt: 'Mine' }] } }, 'attacker', TODAY)
    expect(m.deletedPhotos).toEqual([])

    const again = await m.store.createListing({ ...(listing as never), ownerId: 'attacker', photos: [{ key: victimKey, alt: 'Their camera' }] })
    await deleteMyListing(m.store, again.id, 'attacker')
    expect(m.deletedPhotos).toEqual([])

    await deleteMyAccount(m.store, 'attacker')
    expect(m.deletedPhotos).toEqual(['listing-photos/attacker/'])
  })
})

describe('deleteMyListing', () => {
  it('deletes the listing and its photos, declining open requests', async () => {
    const m = memoryStore()
    const saved = await saveListing(m.store, { listing }, 'owner', TODAY)
    await requestBooking(m.store, { listingId: saved.id, start: '2026-11-20', end: '2026-11-22', delivery: false }, 'renter', TODAY)
    await expect(deleteMyListing(m.store, saved.id, 'renter')).rejects.toThrow(/wasn’t found/)
    expect(await deleteMyListing(m.store, saved.id, 'owner')).toEqual({ declinedRequests: 1 })
    expect(m.listings.has(saved.id)).toBe(false)
    expect(m.deletedPhotos).toEqual([key(1)])
    expect([...m.bookings.values()][0]!.status).toBe('declined')
  })

  it('refuses while a rental is booked or in progress', async () => {
    const m = memoryStore()
    const saved = await saveListing(m.store, { listing }, 'owner', TODAY)
    const b = await requestBooking(m.store, { listingId: saved.id, start: '2026-11-20', end: '2026-11-22', delivery: false }, 'renter', TODAY)
    await respondToBooking(m.store, b.id, 'accept', 'owner')
    await expect(deleteMyListing(m.store, saved.id, 'owner')).rejects.toThrow(/Pause it instead/)
  })
})

describe('rebuilding the site when public listings change', () => {
  it('rebuilds for public changes only', async () => {
    const m = memoryStore()
    const draft = await saveListing(m.store, { listing: { ...listing, status: 'draft' } }, 'owner', TODAY)
    expect(m.rebuilds.count).toBe(0) // drafts aren't public
    await saveListing(m.store, { id: draft.id, listing: { status: 'active' } }, 'owner', TODAY)
    expect(m.rebuilds.count).toBe(1) // published
    await saveListing(m.store, { id: draft.id, listing: { title: 'Two-person dome tent' } }, 'owner', TODAY)
    expect(m.rebuilds.count).toBe(2) // public page changed
    await saveListing(m.store, { id: draft.id, listing: { status: 'paused' } }, 'owner', TODAY)
    expect(m.rebuilds.count).toBe(3) // left the public pages
    await saveListing(m.store, { id: draft.id, listing: { title: 'Paused tent' } }, 'owner', TODAY)
    expect(m.rebuilds.count).toBe(3) // paused edits aren't public
    await deleteMyListing(m.store, draft.id, 'owner')
    expect(m.rebuilds.count).toBe(3) // deleting a paused listing changes nothing public
  })

  it('rebuilds when a live listing is deleted, or its owner deletes their account', async () => {
    const m = memoryStore({ profiles: ['owner'] })
    const a = await saveListing(m.store, { listing }, 'owner', TODAY)
    await saveListing(m.store, { listing }, 'owner', TODAY)
    await deleteMyListing(m.store, a.id, 'owner')
    expect(m.rebuilds.count).toBe(3)
    await deleteMyAccount(m.store, 'owner')
    expect(m.rebuilds.count).toBe(4)
  })
})
