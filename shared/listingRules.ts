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
 * Uploaded photos live in the uploader's own folder; seed data uses built-in
 * placeholders (`ph:`). Nothing else is accepted, so a listing can't point at
 * an arbitrary website.
 */
export const PHOTO_KEY = /^listing-photos\/[\w-]+:[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webp|jpg)$/
const PLACEHOLDER_KEY = /^ph:[a-z-]+:\d+$/

export type ListingErrors = Partial<Record<keyof ListingDraft | 'weekly' | 'monthly' | 'photoAlt', string>>

const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n)

/**
 * Every problem with a listing, keyed by field, in words the owner can act on.
 * An empty object means it's fine. Drafts only need a title, so people can
 * save part-way; anything published (active or paused) must be complete.
 * Used by the List an item form and by the saveListing function.
 */
export function listingErrors(
  d: ListingDraft,
  opts: { today: ISODate; /** Keys already on the saved listing (e.g. seed placeholders), accepted as they are. */ knownKeys?: string[] },
): ListingErrors {
  const e: ListingErrors = {}
  const known = new Set(opts.knownKeys ?? [])
  const isPhotoKey = (key: string) => PHOTO_KEY.test(key) || (known.has(key) && PLACEHOLDER_KEY.test(key))
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
  if (!whole(d.pricing?.daily) || !whole(d.deposit) || !whole(d.minDays) || !whole(d.maxDays)) {
    if (draft) e.pricing = 'Prices and days need to be whole numbers.'
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
  if (!whole(daily) || daily < L.dailyMin || daily > L.dailyMax) e.pricing = `Set a daily price between ₹${L.dailyMin} and ₹1,00,000, in whole rupees.`
  else {
    const { weekly, monthly } = d.pricing
    if (weekly !== undefined && (!whole(weekly) || weekly < daily || weekly >= daily * 7)) {
      e.weekly = `A weekly price should be less than 7 days at the daily price (₹${(daily * 7).toLocaleString('en-IN')}), or leave it empty.`
    }
    if (monthly !== undefined && (!whole(monthly) || monthly < daily || monthly >= daily * 30)) {
      e.monthly = `A monthly price should be less than 30 days at the daily price, or leave it empty.`
    } else if (monthly !== undefined && weekly !== undefined && !e.weekly && monthly < weekly) {
      e.monthly = 'A month should cost more than a week.'
    }
  }
  if (!whole(d.deposit) || d.deposit < 0 || d.deposit > L.depositMax) e.deposit = 'Set a deposit between ₹0 and ₹5,00,000, in whole rupees.'

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
      daily: d.pricing.daily,
      ...(d.pricing.weekly !== undefined ? { weekly: d.pricing.weekly } : {}),
      ...(d.pricing.monthly !== undefined ? { monthly: d.pricing.monthly } : {}),
    },
    deposit: d.deposit,
    minDays: d.minDays,
    maxDays: d.maxDays,
    pickupOptions: PICKUP.filter((p) => d.pickupOptions.includes(p)),
    ...(delivery && d.deliveryFee !== undefined ? { deliveryFee: d.deliveryFee } : {}),
    // Past days no longer matter.
    blockedDates: [...new Set(d.blockedDates)].filter((day) => day >= today).sort(),
    rules: d.rules.map((r) => r.trim()).filter(Boolean),
    status: d.status,
  }
}
