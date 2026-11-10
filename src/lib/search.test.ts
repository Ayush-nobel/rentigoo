import { describe, expect, it } from 'vitest'
import type { Listing } from '@shared/types'
import { searchListings } from './search'

const make = (over: Partial<Listing>): Listing => ({
  id: 'x',
  ownerId: 'o',
  title: 'Thing',
  description: '',
  categoryId: 'tools',
  areaId: 'dwarka',
  photos: [],
  condition: 'good',
  pricing: { daily: 100 },
  deposit: 0,
  minDays: 1,
  maxDays: 30,
  pickupOptions: ['pickup'],
  blockedDates: [],
  rules: [],
  ratingAvg: 0,
  ratingCount: 0,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const all = [
  make({ id: 'drill', title: 'Bosch drill', pricing: { daily: 200 }, deposit: 2000, ratingAvg: 5, ratingCount: 3 }),
  make({ id: 'tent', title: 'Camping tent', categoryId: 'outdoor', areaId: 'noida', pricing: { daily: 350 }, pickupOptions: ['pickup', 'delivery'] }),
  make({ id: 'cam', title: 'Sony camera', description: 'mirrorless body', categoryId: 'cameras', pricing: { daily: 1400 }, blockedDates: ['2026-11-11'], createdAt: '2026-06-01T00:00:00.000Z' }),
  make({ id: 'paused', title: 'Paused drill', status: 'paused' }),
]

const ids = (r: { items: Listing[] }) => r.items.map((l) => l.id)

describe('searchListings', () => {
  it('hides paused listings', () => {
    expect(ids(searchListings(all, {}))).not.toContain('paused')
  })
  it('matches every search word, preferring titles', () => {
    expect(ids(searchListings(all, { q: 'drill' }))).toEqual(['drill'])
    expect(ids(searchListings(all, { q: 'sony mirrorless' }))).toEqual(['cam'])
    expect(ids(searchListings(all, { q: 'sony tent' }))).toEqual([])
  })
  it('filters by category, areas, price, deposit and delivery', () => {
    expect(ids(searchListings(all, { category: 'outdoor' }))).toEqual(['tent'])
    expect(ids(searchListings(all, { areas: ['noida'] }))).toEqual(['tent'])
    expect(ids(searchListings(all, { max: 400, sort: 'price-asc' }))).toEqual(['drill', 'tent'])
    expect(ids(searchListings(all, { noDeposit: true }))).not.toContain('drill')
    expect(ids(searchListings(all, { delivery: true }))).toEqual(['tent'])
  })
  it('hides listings booked on the chosen dates', () => {
    expect(ids(searchListings(all, { from: '2026-11-10', to: '2026-11-12' }))).not.toContain('cam')
    expect(ids(searchListings(all, { from: '2026-11-12', to: '2026-11-14' }))).toContain('cam')
  })
  it('sorts', () => {
    expect(ids(searchListings(all, { sort: 'price-desc' }))[0]).toBe('cam')
    expect(ids(searchListings(all, { sort: 'rating' }))[0]).toBe('drill')
    expect(ids(searchListings(all, { sort: 'newest' }))[0]).toBe('cam')
  })
  it('paginates with load-more semantics', () => {
    const many = Array.from({ length: 30 }, (_, i) => make({ id: `l${i}` }))
    const p1 = searchListings(many, { page: 1 })
    const p3 = searchListings(many, { page: 3 })
    expect(p1.items).toHaveLength(12)
    expect(p1.hasMore).toBe(true)
    expect(p3.items).toHaveLength(30)
    expect(p3.hasMore).toBe(false)
  })
})
