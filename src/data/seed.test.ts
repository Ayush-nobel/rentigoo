import { describe, expect, it } from 'vitest'
import { getArea } from '@shared/areas'
import { getCategory } from '@shared/categories'
import { seedSnapshot } from './index'

describe('seed data', () => {
  const snap = seedSnapshot()
  it('uses only known areas and categories', () => {
    for (const l of snap.listings) {
      expect(getArea(l.areaId), `${l.id} area ${l.areaId}`).toBeDefined()
      expect(getCategory(l.categoryId), `${l.id} category`).toBeDefined()
    }
    for (const u of snap.users) expect(getArea(u.areaId), `${u.id} area ${u.areaId}`).toBeDefined()
  })
  it('points every listing, booking and review at real records', () => {
    const users = new Set(snap.users.map((u) => u.id))
    const listings = new Set(snap.listings.map((l) => l.id))
    for (const l of snap.listings) expect(users.has(l.ownerId)).toBe(true)
    for (const b of snap.bookings) expect(listings.has(b.listingId) && users.has(b.renterId)).toBe(true)
    for (const r of snap.reviews) expect(listings.has(r.listingId) && users.has(r.authorId)).toBe(true)
  })
})

describe('seed listings follow the listing rules', () => {
  it('every seed listing would be accepted by saveListing on a test backend', async () => {
    const { LISTINGS } = await import('./listings')
    const { listingErrors } = await import('@shared/listingRules')
    const { todayIST } = await import('@/lib/format')
    for (const l of LISTINGS) {
      const errs = listingErrors({ ...l, blockedDates: [] }, { today: todayIST(), allowPlaceholders: true })
      expect({ id: l.id, errs }).toEqual({ id: l.id, errs: {} })
    }
  })
})
