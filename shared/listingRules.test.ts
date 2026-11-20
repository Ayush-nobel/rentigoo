import { describe, expect, it } from 'vitest'
import { cleanDraft, listingErrors, photoAlt, type ListingDraft } from './listingRules'

const TODAY = '2026-11-10'
const KEY = 'listing-photos/owner/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp'
const good: ListingDraft = {
  title: 'Canon EOS 200D with kit lens',
  description: 'Two years old, works perfectly. Comes with a 64 GB card, charger and a bag.',
  categoryId: 'cameras',
  areaId: 'mp-nagar',
  photos: [{ key: KEY, alt: 'Black Canon camera with lens, front view' }],
  condition: 'good',
  pricing: { daily: 600, weekly: 3000 },
  deposit: 5000,
  minDays: 1,
  maxDays: 14,
  pickupOptions: ['pickup'],
  blockedDates: [],
  rules: ['No use in rain'],
  itemValue: 45_000,
  receiptKey: 'listing-receipts/owner/3f2b6d1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.pdf',
  status: 'active',
}

describe('item value, bill and the deposit limit', () => {
  it('needs what it cost new before publishing, but not for a paused listing', () => {
    const { itemValue: _v, ...noValue } = good
    expect(listingErrors(noValue, { today: TODAY }).itemValue).toMatch(/cost new/)
    expect(listingErrors({ ...noValue, status: 'paused' }, { today: TODAY })).toEqual({})
  })

  it('caps the deposit at 30% of the value, and never above the category cap', () => {
    expect(listingErrors({ ...good, itemValue: 10_000, deposit: 3_000 }, { today: TODAY })).toEqual({})
    expect(listingErrors({ ...good, itemValue: 10_000, deposit: 3_010 }, { today: TODAY }).deposit).toMatch(/₹3,000: 30%/)
    // ₹1,00,000 camera: 30% is ₹30,000, but cameras are capped at ₹10,000.
    expect(listingErrors({ ...good, itemValue: 100_000, deposit: 10_500 }, { today: TODAY }).deposit).toMatch(/₹10,000/)
  })

  it('needs the original bill above ₹5,000 only', () => {
    const { receiptKey: _k, ...noBill } = good
    expect(listingErrors(noBill, { today: TODAY }).receipt).toMatch(/original bill/)
    expect(listingErrors(noBill, { today: TODAY, hasReceipt: true })).toEqual({})
    expect(listingErrors({ ...noBill, itemValue: 5_000, deposit: 1_500 }, { today: TODAY })).toEqual({})
  })

  it('refuses a bill key that isn’t the owner’s own upload', () => {
    const other = 'listing-receipts/someone/3f2b6d1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f.pdf'
    expect(listingErrors({ ...good, receiptKey: other }, { today: TODAY, ownerId: 'owner' }).receipt).toMatch(/didn’t upload/)
    expect(listingErrors({ ...good, receiptKey: 'listing-photos/owner/x.pdf' }, { today: TODAY }).receipt).toMatch(/didn’t upload/)
  })

  it('never stores the bill key on the listing', () => {
    expect(cleanDraft(good, TODAY)).not.toHaveProperty('receiptKey')
    expect(cleanDraft(good, TODAY).itemValue).toBe(45_000)
  })
})

describe('listingErrors', () => {
  it('accepts a complete listing', () => {
    expect(listingErrors(good, { today: TODAY })).toEqual({})
  })

  it('lets a draft be saved with only a title', () => {
    const draft = { ...good, description: '', categoryId: '', areaId: '', photos: [], status: 'draft' as const }
    expect(listingErrors(draft, { today: TODAY })).toEqual({})
    expect(listingErrors({ ...draft, title: 'Cam' }, { today: TODAY }).title).toMatch(/at least 6/)
  })

  it('needs a photo before publishing, but no description', () => {
    expect(listingErrors({ ...good, photos: [] }, { today: TODAY }).photos).toMatch(/at least one photo/)
    expect(listingErrors({ ...good, photos: [{ key: KEY, alt: '' }] }, { today: TODAY })).toEqual({})
  })

  it('describes photos from the title when the owner gave none', () => {
    expect(photoAlt('', ' Sony  A7 III ', 0)).toBe('Sony A7 III')
    expect(photoAlt('', 'Sony A7 III', 2)).toBe('Sony A7 III, photo 3')
    expect(photoAlt('Camera with lens, front', 'Sony A7 III', 1)).toBe('Camera with lens, front')
  })

  it('refuses photos that are not our uploads', () => {
    for (const key of ['https://evil.example/x.jpg', 'listing-photos/../x.webp', 'ph:cameras:1']) {
      expect(listingErrors({ ...good, photos: [{ key, alt: 'A camera' }] }, { today: TODAY }).photos).toMatch(/didn’t upload/)
    }
    // A built-in placeholder already on the saved listing (seed data) is fine.
    expect(listingErrors({ ...good, photos: [{ key: 'ph:cameras:1', alt: 'A camera' }] }, { today: TODAY, knownKeys: ['ph:cameras:1'] })).toEqual({})
  })

  it('checks prices make sense', () => {
    expect(listingErrors({ ...good, pricing: { daily: 5 } }, { today: TODAY }).pricing).toBeDefined()
    expect(listingErrors({ ...good, pricing: { daily: 600.5 } }, { today: TODAY }).pricing).toBeDefined()
    expect(listingErrors({ ...good, pricing: { daily: 600, weekly: 4200 } }, { today: TODAY }).weekly).toMatch(/less than 7 days/)
    expect(listingErrors({ ...good, pricing: { daily: 600, weekly: 3000, monthly: 2000 } }, { today: TODAY }).monthly).toMatch(/more than a week/)
    expect(listingErrors({ ...good, deposit: -1 }, { today: TODAY }).deposit).toBeDefined()
    // Deposits are capped by kind of item (shared/policy.ts).
    expect(listingErrors({ ...good, categoryId: 'cameras', deposit: 10_000 }, { today: TODAY }).deposit).toBeUndefined()
    expect(listingErrors({ ...good, categoryId: 'cameras', deposit: 10_001 }, { today: TODAY }).deposit).toMatch(/₹10,000/)
  })

  it('checks rental length, pickup and delivery fee', () => {
    expect(listingErrors({ ...good, minDays: 5, maxDays: 3 }, { today: TODAY }).maxDays).toMatch(/shorter/)
    expect(listingErrors({ ...good, maxDays: 120 }, { today: TODAY }).maxDays).toMatch(/90/)
    expect(listingErrors({ ...good, pickupOptions: [] }, { today: TODAY }).pickupOptions).toBeDefined()
    expect(listingErrors({ ...good, pickupOptions: ['delivery'] }, { today: TODAY }).deliveryFee).toBeDefined()
    expect(listingErrors({ ...good, pickupOptions: ['delivery'], deliveryFee: 0 }, { today: TODAY })).toEqual({})
  })

  it('refuses unknown categories, areas and conditions', () => {
    const e = listingErrors({ ...good, categoryId: 'cars', areaId: 'delhi', condition: 'mint' as never }, { today: TODAY })
    expect(Object.keys(e).sort()).toEqual(['areaId', 'categoryId', 'condition'])
  })
})

describe('cleanDraft', () => {
  it('trims text, drops past blocked days and a fee for pickup-only', () => {
    const c = cleanDraft(
      { ...good, title: '  Canon   EOS  ', rules: [' No rain ', ''], blockedDates: ['2026-11-12', '2026-11-01', '2026-11-12'], deliveryFee: 100 },
      TODAY,
    )
    expect(c).toMatchObject({ title: 'Canon EOS', rules: ['No rain'], blockedDates: ['2026-11-12'] })
    expect(c).not.toHaveProperty('deliveryFee')
  })
})

describe('monthly listings', () => {
  const monthlyOnly: ListingDraft = { ...good, pricing: { monthly: 2500 }, months: { min: 3, max: 12 }, categoryId: 'furniture', deposit: 2000 }
  it('accepts a monthly-only listing, and one offering both', () => {
    expect(listingErrors(monthlyOnly, { today: TODAY })).toEqual({})
    expect(listingErrors({ ...good, pricing: { daily: 200, monthly: 4000 }, months: { min: 1, max: 6 } }, { today: TODAY })).toEqual({})
  })
  it('needs at least one way to rent', () => {
    expect(listingErrors({ ...good, pricing: {} }, { today: TODAY }).term).toMatch(/by the day, by the month/)
  })
  it('checks the month price and range', () => {
    expect(listingErrors({ ...monthlyOnly, pricing: { monthly: 50 } }, { today: TODAY }).monthly).toBeDefined()
    expect(listingErrors({ ...monthlyOnly, months: { min: 1, max: 24 } }, { today: TODAY }).months).toMatch(/12 months/)
    expect(listingErrors({ ...monthlyOnly, months: { min: 6, max: 3 } }, { today: TODAY }).months).toMatch(/shorter/)
    expect(listingErrors({ ...good, pricing: { daily: 100, monthly: 3500 }, months: { min: 1, max: 3 } }, { today: TODAY }).monthly).toMatch(/less than 30 days/)
  })
  it('a week price needs a day price', () => {
    expect(listingErrors({ ...monthlyOnly, pricing: { monthly: 2500, weekly: 900 } }, { today: TODAY }).weekly).toBeDefined()
  })
  it('keeps the month range when cleaning', () => {
    expect(cleanDraft(monthlyOnly, TODAY)).toMatchObject({ pricing: { monthly: 2500 }, months: { min: 3, max: 12 } })
    expect(cleanDraft(monthlyOnly, TODAY).pricing).not.toHaveProperty('daily')
  })
})
