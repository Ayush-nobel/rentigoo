/**
 * Creating and editing listings. Everything the owner sends is checked with
 * the same rules the form uses (shared/listingRules); the server sets the
 * owner, ratings and booked days itself.
 */
import { cleanDraft, listingErrors, ownPhotos, receiptOwner, type ListingDraft } from '../../../shared/listingRules'
import type { ISODate } from '../../../shared/types'
import { RuleError, type Store, type StoredListing } from './bookings'

export interface ListingStore {
  getListing(id: string): Promise<StoredListing | null>
  createListing(l: ListingDraft & { ownerId: string; hasReceipt?: boolean }): Promise<StoredListing>
  updateListing(id: string, l: ListingDraft & { hasReceipt?: boolean }): Promise<StoredListing>
  /** Removes uploaded photo (or bill) files. Missing files are fine. */
  deletePhotos(keys: string[]): Promise<void>
  /** Whether an uploaded bill file is really there. */
  receiptExists(key: string): Promise<boolean>
  /** The private record of a listing's bill: which file it is. */
  getReceiptKey(listingId: string): Promise<string | null>
  setReceipt(listingId: string, ownerId: string, key: string): Promise<void>
  /** Removes the record only (the file goes through deletePhotos). */
  deleteReceipt(listingId: string): Promise<void>
  /** A public listing appeared, changed or went away: rebuild the site's pages. Never throws. */
  publicListingsChanged(): Promise<void>
}

export interface SaveListingInput {
  id?: string | null
  listing: unknown
}

const FIELDS: (keyof ListingDraft & keyof StoredListing)[] = [
  'title', 'description', 'categoryId', 'areaId', 'photos', 'condition', 'pricing', 'deposit',
  'minDays', 'maxDays', 'months', 'pickupOptions', 'deliveryFee', 'blockedDates', 'rules', 'itemValue', 'status',
]

/** Keep only the fields an owner may set; anything else in the request is ignored. */
function pick(raw: unknown): ListingDraft {
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!obj || typeof obj !== 'object') throw new RuleError('The listing didn’t come through. Please try again.')
  const out: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in obj) out[f] = (obj as Record<string, unknown>)[f]
  if ('receiptKey' in obj) out.receiptKey = (obj as Record<string, unknown>).receiptKey
  return out as unknown as ListingDraft
}

export async function saveListing(store: ListingStore, input: SaveListingInput, actorId: string, today: ISODate, opts: { allowPlaceholders?: boolean } = {}): Promise<StoredListing> {
  const existing = input.id ? await store.getListing(input.id) : null
  if (input.id && (!existing || existing.ownerId !== actorId)) throw new RuleError('That listing wasn’t found.')

  // An edit can send only what changed (e.g. just the status to pause it).
  let draft: ListingDraft
  try {
    draft = existing ? { ...existingDraft(existing), ...pick(input.listing) } : pick(input.listing)
  } catch (e) {
    if (e instanceof RuleError) throw e
    throw new RuleError('The listing didn’t come through. Please try again.')
  }
  // null clears an optional field on an edit (e.g. switching off monthly rentals).
  for (const k of ['months', 'deliveryFee', 'itemValue', 'receiptKey'] as const) if (draft[k] === null) delete draft[k]
  const errors = listingErrors(draft, {
    today,
    knownKeys: existing?.photos.map((p) => p.key),
    allowPlaceholders: opts.allowPlaceholders,
    ownerId: actorId,
    hasReceipt: Boolean(existing?.hasReceipt),
  })
  const first = Object.values(errors)[0]
  if (first) throw new RuleError(first)
  // A new bill must be the caller's own upload, and actually uploaded.
  const receiptKey = draft.receiptKey ?? undefined
  if (receiptKey && (receiptOwner(receiptKey) !== actorId || !(await store.receiptExists(receiptKey)))) {
    throw new RuleError('The bill didn’t upload properly. Add it again.')
  }

  const clean = cleanDraft(draft, today)
  const hasReceipt = Boolean(receiptKey) || Boolean(existing?.hasReceipt)
  const saved = existing ? await store.updateListing(existing.id, { ...clean, hasReceipt }) : await store.createListing({ ...clean, hasReceipt, ownerId: actorId })

  // A new bill replaces any earlier one, whose file is deleted.
  if (receiptKey) {
    const before = existing ? await store.getReceiptKey(existing.id) : null
    await store.setReceipt(saved.id, actorId, receiptKey)
    if (before && before !== receiptKey && receiptOwner(before) === actorId) await store.deletePhotos([before])
  }

  // Photos taken off the listing are deleted, not left lying around.
  if (existing) {
    const kept = new Set(clean.photos.map((p) => p.key))
    const gone = ownPhotos(existing.photos.map((p) => p.key).filter((k) => !kept.has(k)), actorId)
    if (gone.length) await store.deletePhotos(gone)
  }
  if (existing?.status === 'active' || saved.status === 'active') await store.publicListingsChanged()
  return saved
}

function existingDraft(l: StoredListing): ListingDraft {
  // hasReceipt isn't an owner field; it's re-derived on every save.
  const draft: Record<string, unknown> = {}
  for (const f of FIELDS) if (l[f] !== undefined) draft[f] = l[f]
  return draft as unknown as ListingDraft
}

export interface DeleteListingStore extends ListingStore {
  listBookingsForListing: Store['listBookingsForListing']
  setBookingStatus: Store['setBookingStatus']
  deleteListing(id: string): Promise<void>
}

/**
 * Deletes a listing and its photos. Not while someone has it booked or has it
 * now; open requests are declined so renters aren't left waiting. Past
 * bookings stay as records (they keep the listing id, not the listing).
 */
export async function deleteMyListing(store: DeleteListingStore, id: string, actorId: string): Promise<{ declinedRequests: number }> {
  const listing = await store.getListing(id)
  if (!listing || listing.ownerId !== actorId) throw new RuleError('That listing wasn’t found.')
  const bookings = await store.listBookingsForListing(id)
  const busy = bookings.filter((b) => b.status === 'accepted' || b.status === 'active')
  if (busy.length) {
    throw new RuleError(
      `This listing has ${busy.length === 1 ? 'a booking' : `${busy.length} bookings`} that ${busy.length === 1 ? 'isn’t' : 'aren’t'} finished. Pause it instead, and delete it once ${busy.length === 1 ? 'that rental is' : 'those rentals are'} done or cancelled.`,
    )
  }
  const open = bookings.filter((b) => b.status === 'requested')
  for (const b of open) await store.setBookingStatus(b.id, 'declined')
  const photos = ownPhotos(listing.photos.map((p) => p.key), actorId)
  const receipt = await store.getReceiptKey(id)
  if (receipt && receiptOwner(receipt) === actorId) photos.push(receipt)
  if (photos.length) await store.deletePhotos(photos)
  if (receipt) await store.deleteReceipt(id)
  await store.deleteListing(id)
  if (listing.status === 'active') await store.publicListingsChanged()
  return { declinedRequests: open.length }
}
