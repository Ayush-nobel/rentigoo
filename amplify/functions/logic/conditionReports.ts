/**
 * Pickup and return checks on a booking (see shared/conditionReports.ts).
 * Only the booking's two people can add or see them; photos live in a private
 * folder per author and are only ever shown through links that expire.
 */
import { randomUUID } from 'node:crypto'
import {
  CONDITION_CHECKS,
  CONDITION_LIMITS,
  conditionExpired,
  conditionPhotoFolder,
  conditionProblem,
  conditionReportProblem,
  type ConditionReport,
  type ConditionReportView,
  type ConditionStage,
} from '../../../shared/conditionReports'
import { RuleError, type StoredBooking } from './bookings'

export interface ConditionStore {
  getBooking(id: string): Promise<(StoredBooking & { updatedAt?: string }) | null>
  listReports(bookingId: string): Promise<ConditionReport[]>
  /** Every report, for the daily clean-up. */
  listAllReports(): Promise<ConditionReport[]>
  putReport(r: ConditionReport): Promise<void>
  deleteReport(id: string): Promise<void>
  countPhotos(folder: string, upTo: number): Promise<number>
  presignUpload(key: string, contentType: string, maxBytes: number, validSeconds: number): Promise<{ url: string; fields: Record<string, string> }>
  /** A link to view a private photo, valid for a few minutes. */
  viewUrl(key: string): Promise<string>
  deletePhotos(keys: string[]): Promise<void>
}

const STAGES: ConditionStage[] = ['pickup', 'return']
const MAX_BYTES = 3 * 1024 * 1024
/** Photos one person can hold across all their checks at once. */
const MAX_FILES = 200

async function bookingFor(store: ConditionStore, bookingId: string, actorId: string) {
  const b = await store.getBooking(bookingId)
  if (!b || !b.participants.includes(actorId)) throw new RuleError('Booking not found.')
  return b
}

export async function startConditionPhotoUpload(store: ConditionStore, actorId: string, bookingId: string, ext: unknown) {
  if (ext !== 'webp' && ext !== 'jpg') throw new RuleError('Photos must be WebP or JPEG.')
  const b = await bookingFor(store, bookingId, actorId)
  if (conditionProblem(b, 'pickup') && conditionProblem(b, 'return')) throw new RuleError('This booking isn’t at pickup or return.')
  const folder = conditionPhotoFolder(actorId)
  if ((await store.countPhotos(folder, MAX_FILES)) >= MAX_FILES) throw new RuleError('You’ve added the most check photos we can keep. Older ones are deleted 30 days after each rental ends.')
  const key = `${folder}${randomUUID()}.${ext}`
  return { key, ...(await store.presignUpload(key, ext === 'webp' ? 'image/webp' : 'image/jpeg', MAX_BYTES, 300)) }
}

export interface SaveConditionInput {
  bookingId: string
  stage: unknown
  checks: unknown
  notes: unknown
  photoKeys: unknown
}

/** Records (or replaces) the caller's own check for this stage. */
export async function saveConditionReport(store: ConditionStore, input: SaveConditionInput, actorId: string, now: Date): Promise<ConditionReportView> {
  const stage = input.stage as ConditionStage
  if (!STAGES.includes(stage)) throw new RuleError('Something went wrong. Please try again.')
  const b = await bookingFor(store, input.bookingId, actorId)
  const notAllowed = conditionProblem(b, stage)
  if (notAllowed) throw new RuleError(notAllowed)
  const notes = typeof input.notes === 'string' ? input.notes.trim() : input.notes
  const problem = conditionReportProblem({ checks: input.checks, notes, photoKeys: input.photoKeys }, actorId)
  if (problem) throw new RuleError(problem)

  const raw = input.checks as Record<string, unknown>
  const checks = Object.fromEntries(CONDITION_CHECKS.map((c) => [c.id, raw[c.id] === true])) as ConditionReport['checks']
  const photoKeys = [...new Set(input.photoKeys as string[])]
  const previous = (await store.listReports(b.id)).find((r) => r.stage === stage && r.authorId === actorId)
  const report: ConditionReport = { id: previous?.id ?? randomUUID(), bookingId: b.id, stage, authorId: actorId, checks, notes: notes as string, photoKeys, createdAt: now.toISOString() }
  await store.putReport(report)
  // Photos taken off a replaced check go too (only the caller's own).
  const dropped = (previous?.photoKeys ?? []).filter((k) => !photoKeys.includes(k))
  if (dropped.length) await store.deletePhotos(dropped)
  return view(store, report)
}

/** Both people's checks on a booking, with view links for the photos. */
export async function listConditionReports(store: ConditionStore, bookingId: string, actorId: string): Promise<ConditionReportView[]> {
  const b = await bookingFor(store, bookingId, actorId)
  const reports = await store.listReports(b.id)
  return Promise.all(reports.map((r) => view(store, r)))
}

async function view(store: ConditionStore, r: ConditionReport): Promise<ConditionReportView> {
  const { photoKeys, ...rest } = r
  return { ...rest, photos: await Promise.all(photoKeys.map(async (key) => ({ key, url: await store.viewUrl(key) }))) }
}

/** Daily: deletes checks (and their photos) once their rental ended 30+ days ago, or the booking is gone. */
export async function purgeConditionReports(store: ConditionStore, now: Date): Promise<number> {
  let purged = 0
  for (const r of await store.listAllReports()) {
    const b = await store.getBooking(r.bookingId)
    if (b && !conditionExpired(b, now)) continue
    if (r.photoKeys.length) await store.deletePhotos(r.photoKeys)
    await store.deleteReport(r.id)
    purged++
  }
  return purged
}

export { CONDITION_LIMITS }
