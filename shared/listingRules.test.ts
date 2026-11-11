import { describe, expect, it } from 'vitest'
import { cleanDraft, listingErrors, type ListingDraft } from './listingRules'

const TODAY = '2026-11-10'
const KEY = 'listing-photos/ap-south-1:0f8fad5b-d9cb-469f-a165-70867728950e/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp'
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
  status: 'active',
}

describe('listingErrors', () => {
  it('accepts a complete listing', () => {
    expect(listingErrors(good, { today: TODAY })).toEqual({})
  })

  it('lets a draft be saved with only a title', () => {
    const draft = { ...good, description: '', categoryId: '', areaId: '', photos: [], status: 'draft' as const }
    expect(listingErrors(draft, { today: TODAY })).toEqual({})
    expect(listingErrors({ ...draft, title: 'Cam' }, { today: TODAY }).title).toMatch(/at least 6/)
  })

  it('needs photos with descriptions before publishing', () => {
    expect(listingErrors({ ...good, photos: [] }, { today: TODAY }).photos).toMatch(/at least one photo/)
    expect(listingErrors({ ...good, photos: [{ key: KEY, alt: ' ' }] }, { today: TODAY }).photoAlt).toMatch(/Describe each photo/)
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
  const monthlyOnly: ListingDraft = { ...good, pricing: { monthly: 2500 }, months: { min: 3, max: 12 }, categoryId: 'furniture' }
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
