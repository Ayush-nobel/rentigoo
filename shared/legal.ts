/**
 * Versions of the documents people agree to. Bump the version (and date)
 * whenever the meaning of a document changes; we record which version each
 * person accepted, and when.
 */
export const LEGAL = {
  terms: { version: '2026-11-18', title: 'Terms and Conditions', path: '/terms' },
  privacy: { version: '2026-11-18-2', title: 'Privacy Policy', path: '/privacy' },
  cookies: { version: '2026-11-10', title: 'Cookie and Storage Policy', path: '/cookies' },
  refunds: { version: '2026-11-11', title: 'Cancellation and Refund Policy', path: '/refunds' },
} as const

/** Minimum age to hold an account (DPDP Act: under-18s need verifiable parental consent, which we don't collect). */
export const MIN_AGE = 18

/** Public name: first name plus last initial, e.g. "Meera J.". Full names stay private. */
export function publicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'RentiGoo member'
  const first = parts[0]!
  const last = parts.length > 1 ? parts[parts.length - 1]! : ''
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first
}
