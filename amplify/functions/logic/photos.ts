/**
 * Listing photo uploads. The browser can't write to the photo bucket itself:
 * it asks here for a short-lived upload form for a new file in the person's own
 * folder (named after their user ID), limited to one small image. So every
 * photo's folder says who uploaded it, and the server only ever deletes files
 * in the caller's own folder.
 */
import { randomUUID } from 'node:crypto'
import { ownPhotos, photoFolder } from '../../../shared/listingRules'
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

export interface PhotoUploadStore {
  /** Files in a folder, counting up to `upTo`. */
  countPhotos(folder: string, upTo: number): Promise<number>
  /** A signed upload form for exactly this key, type and size limit. */
  presignUpload(key: string, contentType: string, maxBytes: number, validSeconds: number): Promise<{ url: string; fields: Record<string, string> }>
  deletePhotos(keys: string[]): Promise<void>
  /** Photo keys on this person's saved listings. */
  photosOnListings(userId: string): Promise<string[]>
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

/** Deletes photos uploaded but not kept: only the caller's own, and never one on a saved listing. */
export async function discardPhotos(store: PhotoUploadStore, actorId: string, keys: unknown): Promise<boolean> {
  if (!Array.isArray(keys) || keys.length > UPLOAD.maxDiscard) throw new RuleError('That didn’t go through. Please try again.')
  const mine = ownPhotos(keys.filter((k): k is string => typeof k === 'string'), actorId)
  if (!mine.length) return true
  const used = new Set(await store.photosOnListings(actorId))
  const gone = mine.filter((k) => !used.has(k))
  if (gone.length) await store.deletePhotos(gone)
  return true
}
