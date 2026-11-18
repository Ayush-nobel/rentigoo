import { depositCap } from './policy'
import { getArea } from './areas'
import { getCategory } from './categories'
import { parseISODate } from './pricing'
import type { Condition, ISODate, Listing, ListingStatus, PickupOption } from './types'


/** What an owner fills in for a listing. Everything else is set by the server. */
export type ListingDraft = Pick<
  Listing,
  | 'title'
  | 'description'
  | 'categoryId'
  | 'areaId'
  | 'photos'
  | 'condition'
  | 'pricing'
  | 'deposit'
  | 'minDays'
  | 'maxDays'
  | 'months'
  | 'pickupOptions'
  | 'deliveryFee'
  | 'blockedDates'
  | 'rules'
  | 'status'
>

export const LISTING_LIMITS = {
  titleMin: 6,
  titleMax: 80,
  descriptionMin: 30,
  descriptionMax: 2000,
  photosMax: 8,
  altMin: 3,
  altMax: 150,
  dailyMin: 10,
  dailyMax: 100_000,
  depositMax: 500_000,
  deliveryFeeMax: 5_000,
  maxDaysCap: 90,
  monthlyMin: 100,
  monthlyMax: 1_000_000,
  maxMonthsCap: 12,
  rulesMax: 8,
  ruleMax: 120,
  blockedDaysMax: 366,
} as const

export const CONDITIONS: { id: Condition; name: string; hint: string }[] = [
  { id: 'new', name: 'New', hint: 'Unused, or used once or twice' },
  { id: 'like-new', name: 'Like new', hint: 'No marks you’d notice' },
  { id: 'good', name: 'Good', hint: 'Works perfectly, some signs of use' },
  { id: 'fair', name: 'Fair', hint: 'Works, but clearly used' },
]

const STATUSES: ListingStatus[] = ['active', 'paused', 'draft']
const PICKUP: PickupOption[] = ['pickup', 'delivery']

/**
 * Uploaded photos live in the uploader's own folder, named after their user ID
 * (the server issues every upload, so the folder can't be chosen by the browser).
 * Seed data uses built-in placeholders (`ph:`). Nothing else is accepted, so a
 * listing can't point at an arbitrary website, or at someone else's photos.
 */
export const PHOTO_KEY = /^listing-photos\/([\w-]{1,64})\/[0-9a-f-]{36}\.(webp|jpg)$/
/** Keys from before 2026-11-18 (folders named after the Cognito identity): kept on old listings, never accepted new. */
export const LEGACY_PHOTO_KEY = /^listing-photos\/[\w-]+:[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/
/** Whose folder a photo key is in, or null if it isn't an uploaded photo. */
export const photoOwner = (key: string): string | null => PHOTO_KEY.exec(key)?.[1] ?? null
/** A person's photo folder. */
export const photoFolder = (userId: string) => `listing-photos/${userId}/`
/** Only the keys in this person's own folder: the server never deletes anyone else's files. */
export const ownPhotos = (keys: string[], userId: string) => keys.filter((k) => photoOwner(k) === userId)
const PLACEHOLDER_KEY = /^ph:[a-z-]+:\d+$/

export type ListingErrors = Partial<Record<keyof ListingDraft | 'weekly' | 'monthly' | 'photoAlt' | 'term', string>>

const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

/**
 * Every problem with a listing, keyed by field, in words the owner can act on.
 * An empty object means it's fine. Drafts only need a title, so people can
 * save part-way; anything published (active or paused) must be complete.
 * Used by the List an item form and by the saveListing function.
 */
export function listingErrors(
  d: ListingDraft,
  opts: {
    today: ISODate
    /** Keys already on the saved listing (e.g. seed placeholders), accepted as they are. */
    knownKeys?: string[]
    /** Test backends only: accept built-in placeholder pictures (`ph:`), so demo data can be seeded. */
    allowPlaceholders?: boolean
    /** On the server: new photos must be in this person's own folder. */
    ownerId?: string
  },
): ListingErrors {
  const e: ListingErrors = {}
  const known = new Set(opts.knownKeys ?? [])
  const isPhotoKey = (key: string) =>
    known.has(key)
      ? PHOTO_KEY.test(key) || LEGACY_PHOTO_KEY.test(key) || PLACEHOLDER_KEY.test(key)
      : (PHOTO_KEY.test(key) && (opts.ownerId === undefined || photoOwner(key) === opts.ownerId)) || (Boolean(opts.allowPlaceholders) && PLACEHOLDER_KEY.test(key))
  const L = LISTING_LIMITS
  const title = (d.title ?? '').trim()
  if (title.length < L.titleMin) e.title = `Give it a title of at least ${L.titleMin} characters, e.g. “Canon EOS 200D with 18–55mm lens”.`
  else if (title.length > L.titleMax) e.title = `Keep the title under ${L.titleMax} characters.`

  if (!STATUSES.includes(d.status)) e.status = 'Choose whether to publish or save as a draft.'
  const draft = d.status === 'draft'

  // Shape checks apply even to drafts (they're stored as-is).
  if ((d.description ?? '').length > L.descriptionMax) e.description = `Keep the description under ${L.descriptionMax} characters.`
  if (!Array.isArray(d.photos) || d.photos.length > L.photosMax) e.photos = `Add up to ${L.photosMax} photos.`
  else if (d.photos.some((p) => !p || typeof p.key !== 'string' || !isPhotoKey(p.key))) {
    e.photos = 'One of the photos didn’t upload properly. Remove it and add it again.'
  } else if (d.photos.some((p) => typeof p.alt !== 'string' || p.alt.trim().length > L.altMax)) {
    e.photoAlt = `Keep each photo description under ${L.altMax} characters.`
  }
  if (!Array.isArray(d.rules) || d.rules.length > L.rulesMax) e.rules = `Add up to ${L.rulesMax} rules.`
  else if (d.rules.some((r) => typeof r !== 'string' || r.trim().length === 0 || r.length > L.ruleMax)) {
    e.rules = `Each rule needs some words, and under ${L.ruleMax} characters.`
  }
  if (!Array.isArray(d.blockedDates) || d.blockedDates.length > L.blockedDaysMax) e.blockedDates = 'That’s too many blocked days.'
  else {
    try {
      d.blockedDates.forEach(parseISODate)
    } catch {
      e.blockedDates = 'Some blocked days aren’t real dates. Pick them again.'
    }
  }
  if (!Array.isArray(d.pickupOptions) || d.pickupOptions.some((p) => !PICKUP.includes(p))) e.pickupOptions = 'Choose pickup, delivery or both.'
  if (!CONDITIONS.some((c) => c.id === d.condition)) e.condition = 'Choose the condition.'
  const dailyOk = d.pricing?.daily === undefined || whole(d.pricing.daily)
  const monthsOk = d.months === undefined || (whole(d.months?.min) && whole(d.months?.max))
  if (!dailyOk || (d.pricing?.monthly !== undefined && !whole(d.pricing.monthly)) || !whole(d.deposit) || !whole(d.minDays) || !whole(d.maxDays) || !monthsOk) {
    if (draft) e.pricing = 'Prices and lengths need to be whole numbers.'
  }

  if (draft) return e

  // Published listings must be complete.
  const desc = (d.description ?? '').trim()
  if (!e.description && desc.length < L.descriptionMin) {
    e.description = `Tell renters a bit more (at least ${L.descriptionMin} characters): what’s included, how old it is, anything to know.`
  }
  if (!getCategory(d.categoryId)) e.categoryId = 'Choose a category.'
  if (!getArea(d.areaId)) e.areaId = 'Choose the area where renters collect it.'
  if (!e.photos && d.photos.length === 0) e.photos = 'Add at least one photo so renters can see what they’re getting.'
  if (!e.photos && !e.photoAlt && d.photos.some((p) => p.alt.trim().length < L.altMin)) {
    e.photoAlt = 'Describe each photo in a few words, for people who use screen readers.'
  }

  const daily = d.pricing?.daily
  const monthly = d.pricing?.monthly
  const byDay = daily !== undefined
  const byMonth = d.months !== undefined
  if (!byDay && !byMonth) e.term = 'Choose whether people can rent it by the day, by the month, or both.'
  if (byDay) {
    if (!whole(daily) || daily < L.dailyMin || daily > L.dailyMax) e.pricing = `Set a daily price between ₹${L.dailyMin} and ₹1,00,000, in whole rupees.`
    else {
      const { weekly } = d.pricing
      if (weekly !== undefined && (!whole(weekly) || weekly < daily || weekly >= daily * 7)) {
        e.weekly = `A weekly price should be less than 7 days at the daily price (₹${(daily * 7).toLocaleString('en-IN')}), or leave it empty.`
      }
    }
    if (!whole(d.minDays) || d.minDays < 1) e.minDays = 'The shortest rental is at least 1 day.'
    if (!whole(d.maxDays) || d.maxDays > L.maxDaysCap) e.maxDays = `The longest rental by the day can be up to ${L.maxDaysCap} days.`
    else if (!e.minDays && d.maxDays < d.minDays) e.maxDays = 'The longest rental can’t be shorter than the shortest.'
  } else if (d.pricing?.weekly !== undefined) {
    e.weekly = 'A weekly price needs a daily price too.'
  }
  if (byMonth) {
    if (!whole(monthly) || monthly < L.monthlyMin || monthly > L.monthlyMax) e.monthly = `Set a monthly price between ₹${L.monthlyMin} and ₹10,00,000, in whole rupees.`
    else if (byDay && !e.pricing && monthly >= daily! * 30) e.monthly = `A month should cost less than 30 days at the daily price (₹${(daily! * 30).toLocaleString('en-IN')}).`
    else if (byDay && !e.pricing && d.pricing.weekly !== undefined && monthly < d.pricing.weekly) e.monthly = 'A month should cost more than a week.'
    const { min, max } = d.months!
    if (!whole(min) || min < 1 || min > L.maxMonthsCap) e.months = `The shortest monthly rental is 1 to ${L.maxMonthsCap} months.`
    else if (!whole(max) || max > L.maxMonthsCap) e.months = `The longest monthly rental can be up to ${L.maxMonthsCap} months.`
    else if (max < min) e.months = 'The longest rental can’t be shorter than the shortest.'
  } else if (monthly !== undefined) {
    // A monthly price on a daily-only listing works as a discount on long daily rentals.
    if (!byDay || !whole(monthly) || monthly < (daily ?? 0) || monthly >= (daily ?? 0) * 30) {
      e.monthly = 'A monthly price should be less than 30 days at the daily price, or leave it empty.'
    } else if (d.pricing.weekly !== undefined && !e.weekly && monthly < d.pricing.weekly) {
      e.monthly = 'A month should cost more than a week.'
    }
  }
  const cap = depositCap(d.categoryId, L.depositMax)
  if (!whole(d.deposit) || d.deposit < 0) e.deposit = 'Set a deposit in whole rupees, or ₹0 for none.'
  else if (d.deposit > cap) e.deposit = `The most a deposit can be for this kind of item is ₹${cap.toLocaleString('en-IN')}.`

  if (!whole(d.minDays) || d.minDays < 1) e.minDays = 'The shortest rental is at least 1 day.'
  if (!whole(d.maxDays) || d.maxDays > L.maxDaysCap) e.maxDays = `The longest rental can be up to ${L.maxDaysCap} days.`
  else if (!e.minDays && d.maxDays < d.minDays) e.maxDays = 'The longest rental can’t be shorter than the shortest.'

  if (!e.pickupOptions && d.pickupOptions.length === 0) e.pickupOptions = 'Choose pickup, delivery or both.'
  if (d.pickupOptions?.includes('delivery')) {
    if (!whole(d.deliveryFee) || d.deliveryFee < 0 || d.deliveryFee > L.deliveryFeeMax) {
      e.deliveryFee = 'Set a delivery fee between ₹0 and ₹5,000 (₹0 for free delivery).'
    }
  }
  return e
}

/** Tidy what the owner typed before it's stored: trimmed text, no stray fields. */
export function cleanDraft(d: ListingDraft, today: ISODate): ListingDraft {
  const delivery = d.pickupOptions.includes('delivery')
  return {
    title: d.title.trim().replace(/\s+/g, ' '),
    description: d.description.trim(),
    categoryId: d.categoryId,
    areaId: d.areaId,
    photos: d.photos.map((p) => ({ key: p.key, alt: p.alt.trim().replace(/\s+/g, ' ') })),
    condition: d.condition,
    pricing: {
      ...(d.pricing.daily !== undefined ? { daily: d.pricing.daily } : {}),
      ...(d.pricing.weekly !== undefined ? { weekly: d.pricing.weekly } : {}),
      ...(d.pricing.monthly !== undefined ? { monthly: d.pricing.monthly } : {}),
    },
    deposit: d.deposit,
    minDays: d.minDays,
    maxDays: d.maxDays,
    ...(d.months ? { months: { min: d.months.min, max: d.months.max } } : {}),
    pickupOptions: PICKUP.filter((p) => d.pickupOptions.includes(p)),
    ...(delivery && d.deliveryFee !== undefined ? { deliveryFee: d.deliveryFee } : {}),
    // Past days no longer matter.
    blockedDates: [...new Set(d.blockedDates)].filter((day) => day >= today).sort(),
    rules: d.rules.map((r) => r.trim()).filter(Boolean),
    status: d.status,
  }
}
