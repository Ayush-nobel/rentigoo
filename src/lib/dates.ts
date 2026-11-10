import type { ISODate } from '@shared/types'

/** `YYYY-MM-DD` → a local-midnight Date (what calendar widgets expect). */
export function isoToLocalDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** Local Date → `YYYY-MM-DD`, ignoring the time of day. */
export function localDateToISO(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
