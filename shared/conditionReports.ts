/**
 * Pickup and return checks: at handover (and at return), the owner and the
 * renter can each record a short checklist and up to 6 photos on the booking.
 * Both see both. It's what a damage disagreement is judged on.
 * Photos are private (never public URLs) and deleted 30 days after the rental ends.
 */
import type { Booking } from './types'

export type ConditionStage = 'pickup' | 'return'

export const CONDITION_CHECKS = [
  { id: 'works', label: 'It works: switched on or tried out' },
  { id: 'complete', label: 'Every part and accessory listed is there' },
  { id: 'marksNoted', label: 'Any scratches, dents or marks are in the photos or notes' },
] as const
export type ConditionCheckId = (typeof CONDITION_CHECKS)[number]['id']

export const CONDITION_LIMITS = { photosMax: 6, notesMax: 500, keepDaysAfterEnd: 30 }

export interface ConditionReport {
  id: string
  bookingId: string
  stage: ConditionStage
  authorId: string
  checks: Record<ConditionCheckId, boolean>
  notes: string
  /** Private photo keys (condition-photos/<author>/<uuid>.webp). */
  photoKeys: string[]
  createdAt: string
}

/** A report as the app shows it: photos as short-lived links. */
export interface ConditionReportView extends Omit<ConditionReport, 'photoKeys'> {
  photos: { key: string; url: string }[]
}

export const CONDITION_PHOTO_KEY = /^condition-photos\/([\w-]{1,64})\/[0-9a-f-]{36}\.(webp|jpg)$/
export const conditionPhotoOwner = (key: string) => CONDITION_PHOTO_KEY.exec(key)?.[1] ?? null
export const conditionPhotoFolder = (userId: string) => `condition-photos/${userId}/`

/** Why this check can't be recorded now, or null if it can. */
export function conditionProblem(b: Pick<Booking, 'status'>, stage: ConditionStage): string | null {
  if (stage === 'pickup' && !['accepted', 'active'].includes(b.status)) return 'The pickup check is for accepted bookings, at handover.'
  if (stage === 'return' && !['active', 'completed'].includes(b.status)) return 'The return check is for when the item comes back.'
  return null
}

/** Checks a report before it's saved. Returns the first problem, or null. */
export function conditionReportProblem(r: { checks: unknown; notes: unknown; photoKeys: unknown }, authorId: string): string | null {
  if (typeof r.notes !== 'string' || r.notes.length > CONDITION_LIMITS.notesMax) return `Keep the notes under ${CONDITION_LIMITS.notesMax} characters.`
  if (!r.checks || typeof r.checks !== 'object') return 'Something went wrong. Please try again.'
  if (!Array.isArray(r.photoKeys) || r.photoKeys.length > CONDITION_LIMITS.photosMax) return `Add up to ${CONDITION_LIMITS.photosMax} photos.`
  if (r.photoKeys.some((k) => typeof k !== 'string' || conditionPhotoOwner(k) !== authorId)) return 'One of the photos didn’t upload properly. Remove it and add it again.'
  if (r.photoKeys.length === 0 && !r.notes.trim()) return 'Add at least one photo, or a note about the item’s condition.'
  return null
}

/** The rental has ended this many days ago (or more): its checks can be deleted. */
export function conditionExpired(b: Pick<Booking, 'status'> & { updatedAt?: string }, now: Date): boolean {
  if (!['completed', 'cancelled', 'declined'].includes(b.status) || !b.updatedAt) return false
  return now.getTime() - Date.parse(b.updatedAt) > CONDITION_LIMITS.keepDaysAfterEnd * 86_400_000
}
