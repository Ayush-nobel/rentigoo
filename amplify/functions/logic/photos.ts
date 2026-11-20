/**
 * Listing photo uploads. The browser can't write to the photo bucket itself:
 * it asks here for a short-lived upload form for a new file in the person's own
 * folder (named after their user ID), limited to one small image. So every
 * photo's folder says who uploaded it, and the server only ever deletes files
 * in the caller's own folder.
 */
import { randomUUID } from 'node:crypto'
import { ownPhotos, photoFolder, receiptFolder, receiptOwner } from '../../../shared/listingRules'
import { RuleError } from './bookings'

export const UPLOAD = {
  /** Photos are resized in the browser to about 1600px WebP, well under this. */
  maxBytes: 3 * 1024 * 1024,
  /** Files one person can have at once (8 photos × many listings, plus some slack). */
  maxFilesPerPerson: 300,
  /** How long an upload form stays usable. */
  validSeconds: 300,
  /** Most keys one discard call may name. */
  maxDiscard: 50,
}
const TYPES = { webp: 'image/webp', jpg: 'image/jpeg' } as const

/** Original bills: a photo (resized in the browser) or a PDF, a few per listing. */
export const RECEIPT_UPLOAD = {
  imageMaxBytes: 3 * 1024 * 1024,
  pdfMaxBytes: 5 * 1024 * 1024,
  maxFilesPerPerson: 100,
}
const RECEIPT_TYPES = { ...TYPES, pdf: 'application/pdf' } as const

export interface PhotoUploadStore {
  /** Files in a folder, counting up to `upTo`. */
  countPhotos(folder: string, upTo: number): Promise<number>
  /** A signed upload form for exactly this key, type and size limit. */
  presignUpload(key: string, contentType: string, maxBytes: number, validSeconds: number): Promise<{ url: string; fields: Record<string, string> }>
  deletePhotos(keys: string[]): Promise<void>
  /** Photo keys on this person's saved listings. */
  photosOnListings(userId: string): Promise<string[]>
  /** Bill keys on file for this person's saved listings. */
  receiptsOnListings(userId: string): Promise<string[]>
}

export interface PhotoUpload {
  key: string
  url: string
  fields: Record<string, string>
}

export async function startPhotoUpload(store: Pick<PhotoUploadStore, 'countPhotos' | 'presignUpload'>, actorId: string, ext: unknown): Promise<PhotoUpload> {
  if (ext !== 'webp' && ext !== 'jpg') throw new RuleError('Photos must be WebP or JPEG.')
  const folder = photoFolder(actorId)
  if ((await store.countPhotos(folder, UPLOAD.maxFilesPerPerson)) >= UPLOAD.maxFilesPerPerson) {
    throw new RuleError('You’ve uploaded the most photos we can keep for one account. Remove some from your listings first.')
  }
  const key = `${folder}${randomUUID()}.${ext}`
  const form = await store.presignUpload(key, TYPES[ext], UPLOAD.maxBytes, UPLOAD.validSeconds)
  return { key, ...form }
}

/** A signed form for one bill (photo or PDF) in the person's own private folder. */
export async function startReceiptUpload(store: Pick<PhotoUploadStore, 'countPhotos' | 'presignUpload'>, actorId: string, ext: unknown): Promise<PhotoUpload> {
  if (ext !== 'webp' && ext !== 'jpg' && ext !== 'pdf') throw new RuleError('The bill must be a photo (JPEG or WebP) or a PDF.')
  const folder = receiptFolder(actorId)
  if ((await store.countPhotos(folder, RECEIPT_UPLOAD.maxFilesPerPerson)) >= RECEIPT_UPLOAD.maxFilesPerPerson) {
    throw new RuleError('You’ve uploaded the most bills we can keep for one account. Delete a listing you no longer need first.')
  }
  const key = `${folder}${randomUUID()}.${ext}`
  const form = await store.presignUpload(key, RECEIPT_TYPES[ext], ext === 'pdf' ? RECEIPT_UPLOAD.pdfMaxBytes : RECEIPT_UPLOAD.imageMaxBytes, UPLOAD.validSeconds)
  return { key, ...form }
}

/**
 * Deletes photos and bills uploaded but not kept: only the caller's own, and
 * never one a saved listing uses.
 */
export async function discardPhotos(store: PhotoUploadStore, actorId: string, keys: unknown): Promise<boolean> {
  if (!Array.isArray(keys) || keys.length > UPLOAD.maxDiscard) throw new RuleError('That didn’t go through. Please try again.')
  const strings = keys.filter((k): k is string => typeof k === 'string')
  const photos = ownPhotos(strings, actorId)
  const bills = strings.filter((k) => receiptOwner(k) === actorId)
  const gone: string[] = []
  if (photos.length) {
    const used = new Set(await store.photosOnListings(actorId))
    gone.push(...photos.filter((k) => !used.has(k)))
  }
  if (bills.length) {
    const used = new Set(await store.receiptsOnListings(actorId))
    gone.push(...bills.filter((k) => !used.has(k)))
  }
  if (gone.length) await store.deletePhotos(gone)
  return true
}

export interface ReceiptPurgeStore {
  /** Every bill file, with when it was uploaded. */
  listReceiptFiles(): Promise<{ key: string; uploadedAt: Date }[]>
  /** Keys of every bill a saved listing uses. */
  receiptKeysInUse(): Promise<string[]>
  deletePhotos(keys: string[]): Promise<void>
}

/**
 * Daily: bills uploaded but never saved with a listing (the form was left
 * unfinished) are deleted a day later. Returns how many.
 */
export async function purgeUnusedReceipts(store: ReceiptPurgeStore, now: Date): Promise<number> {
  const used = new Set(await store.receiptKeysInUse())
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000
  const gone = (await store.listReceiptFiles()).filter((f) => !used.has(f.key) && f.uploadedAt.getTime() < dayAgo).map((f) => f.key)
  if (gone.length) await store.deletePhotos(gone)
  return gone.length
}
