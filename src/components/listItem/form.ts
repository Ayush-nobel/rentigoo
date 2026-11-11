import { listingErrors, type ListingDraft, type ListingErrors } from '@shared/listingRules'
import type { Condition, ISODate, Listing, ListingStatus, PickupOption } from '@shared/types'

/** A photo in the form: uploading, ready, or failed. */
export interface FormPhoto {
  /** Stable id for React and for focus. */
  id: string
  /** Storage key once uploaded. */
  key?: string
  /** Local preview while it uploads (and after, in this tab). */
  preview?: string
  alt: string
  state: 'preparing' | 'uploading' | 'ready' | 'failed'
  error?: string
  /** Uploaded in this visit (so we can delete it if it's removed before saving). */
  fresh?: boolean
}

/** What the form holds. Numbers stay as typed text until saving. */
export interface ListingForm {
  title: string
  categoryId: string
  condition: Condition | ''
  description: string
  areaId: string
  photos: FormPhoto[]
  /** Rented by the day, by the month, or both. */
  byDay: boolean
  byMonth: boolean
  daily: string
  weekly: string
  monthly: string
  minMonths: string
  maxMonths: string
  deposit: string
  minDays: string
  maxDays: string
  pickup: boolean
  delivery: boolean
  deliveryFee: string
  rules: string[]
  blockedDates: ISODate[]
}

export const STEPS = [
  { id: 'details', name: 'What it is', fields: ['title', 'categoryId', 'condition', 'description', 'areaId'] },
  { id: 'photos', name: 'Photos', fields: ['photos', 'photoAlt'] },
  { id: 'price', name: 'Price and deposit', fields: ['term', 'pricing', 'weekly', 'monthly', 'months', 'deposit', 'minDays', 'maxDays'] },
  { id: 'pickup', name: 'Pickup and dates', fields: ['pickupOptions', 'deliveryFee', 'rules', 'blockedDates'] },
  { id: 'review', name: 'Check and publish', fields: [] },
] as const satisfies readonly { id: string; name: string; fields: readonly (keyof ListingErrors)[] }[]

export type StepId = (typeof STEPS)[number]['id']

export function emptyForm(areaId: string): ListingForm {
  return {
    title: '',
    categoryId: '',
    condition: '',
    description: '',
    areaId,
    photos: [],
    byDay: true,
    byMonth: false,
    daily: '',
    weekly: '',
    monthly: '',
    minMonths: '1',
    maxMonths: '12',
    deposit: '0',
    minDays: '1',
    maxDays: '14',
    pickup: true,
    delivery: false,
    deliveryFee: '',
    rules: [],
    blockedDates: [],
  }
}

const text = (n: number | undefined) => (n === undefined ? '' : String(n))

export function formFromListing(l: Listing): ListingForm {
  return {
    title: l.title,
    categoryId: l.categoryId,
    condition: l.condition,
    description: l.description,
    areaId: l.areaId,
    photos: l.photos.map((p, i) => ({ id: `saved-${i}-${p.key}`, key: p.key, alt: p.alt, state: 'ready' })),
    byDay: l.pricing.daily !== undefined,
    byMonth: l.months !== undefined,
    daily: text(l.pricing.daily),
    weekly: text(l.pricing.weekly),
    monthly: text(l.pricing.monthly),
    minMonths: text(l.months?.min ?? 1),
    maxMonths: text(l.months?.max ?? 12),
    deposit: text(l.deposit),
    minDays: text(l.minDays),
    maxDays: text(l.maxDays),
    pickup: l.pickupOptions.includes('pickup'),
    delivery: l.pickupOptions.includes('delivery'),
    deliveryFee: text(l.deliveryFee),
    rules: [...l.rules],
    blockedDates: [...(l.ownerBlockedDates ?? l.blockedDates)],
  }
}

/** Whole rupees or days. Empty → undefined; anything else that isn't a whole number → NaN (fails the rules). */
function num(s: string): number | undefined {
  const t = s.replace(/[,\s₹]/g, '')
  if (t === '') return undefined
  return /^\d+$/.test(t) ? Number(t) : Number.NaN
}

export function toDraft(f: ListingForm, status: ListingStatus): ListingDraft {
  const pickupOptions: PickupOption[] = [...(f.pickup ? ['pickup' as const] : []), ...(f.delivery ? ['delivery' as const] : [])]
  const weekly = f.byDay ? num(f.weekly) : undefined
  const monthly = f.byMonth ? (num(f.monthly) ?? (status === 'draft' ? undefined : Number.NaN)) : f.byDay ? num(f.monthly) : undefined
  const deliveryFee = num(f.deliveryFee)
  const daily = f.byDay ? (num(f.daily) ?? (status === 'draft' ? undefined : Number.NaN)) : undefined
  return {
    title: f.title,
    description: f.description,
    categoryId: f.categoryId,
    areaId: f.areaId,
    photos: f.photos.filter((p) => p.state === 'ready' && p.key).map((p) => ({ key: p.key!, alt: p.alt })),
    condition: (f.condition || 'good') as Condition,
    pricing: { ...(daily !== undefined ? { daily } : {}), ...(weekly !== undefined ? { weekly } : {}), ...(monthly !== undefined ? { monthly } : {}) },
    deposit: num(f.deposit) ?? 0,
    minDays: num(f.minDays) ?? Number.NaN,
    maxDays: num(f.maxDays) ?? Number.NaN,
    // Explicitly undefined when off, so an edit switches monthly rentals off.
    months: f.byMonth ? { min: num(f.minMonths) ?? Number.NaN, max: num(f.maxMonths) ?? Number.NaN } : undefined,
    pickupOptions,
    ...(f.delivery ? { deliveryFee: deliveryFee ?? Number.NaN } : {}),
    blockedDates: f.blockedDates,
    rules: f.rules.filter((r) => r.trim()),
    status,
  }
}

/** Problems on one step (as if publishing), plus form-only checks. */
export function stepErrors(f: ListingForm, step: StepId, today: ISODate, knownKeys: string[]): ListingErrors {
  const all = listingErrors(toDraft(f, 'active'), { today, knownKeys })
  if (!f.condition) all.condition = 'Choose the condition.'
  if (f.photos.some((p) => p.state === 'preparing' || p.state === 'uploading')) all.photos = 'Wait for your photos to finish uploading.'
  else if (f.photos.some((p) => p.state === 'failed')) all.photos = 'Some photos didn’t upload. Remove them or try again.'
  const fields = STEPS.find((s) => s.id === step)!.fields as readonly (keyof ListingErrors)[]
  const out: ListingErrors = {}
  for (const k of fields) if (all[k]) out[k] = all[k]
  return out
}

export function allErrors(f: ListingForm, today: ISODate, knownKeys: string[]) {
  return STEPS.map((s) => ({ step: s, errors: stepErrors(f, s.id, today, knownKeys) }))
}
