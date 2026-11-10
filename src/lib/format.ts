import type { ISODate, ISODateTime } from '@shared/types'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹1,25,000 (Indian digit grouping, whole rupees). */
export function rupees(amount: number): string {
  return inr.format(Math.round(amount))
}

/** 1,25,000 without the symbol. */
export function number(n: number): string {
  return num.format(Math.round(n))
}

/** Short Indian money: ₹1.2L, ₹8.5k. */
export function rupeesShort(amount: number): string {
  const a = Math.round(amount)
  if (Math.abs(a) >= 1_00_00_000) return `₹${trim(a / 1_00_00_000)}Cr`
  if (Math.abs(a) >= 1_00_000) return `₹${trim(a / 1_00_000)}L`
  if (Math.abs(a) >= 10_000) return `₹${trim(a / 1000)}k`
  return rupees(a)
}

const trim = (n: number) => n.toFixed(1).replace(/\.0$/, '')

const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dayYearFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthYearFmt = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' })

/** 12 Nov */
export function shortDate(d: ISODate): string {
  return dayFmt.format(new Date(`${d}T00:00:00Z`))
}

/** 12 Nov 2026 */
export function longDate(d: ISODate): string {
  return dayYearFmt.format(new Date(`${d}T00:00:00Z`))
}

/** 12–15 Nov, or 30 Nov – 2 Dec */
export function dateRange(start: ISODate, end: ISODate): string {
  const s = new Date(`${start}T00:00:00Z`)
  const e = new Date(`${end}T00:00:00Z`)
  if (s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear()) {
    return `${s.getUTCDate()}–${shortDate(end)}`
  }
  return `${shortDate(start)} – ${shortDate(end)}`
}

/** Joined November 2025 */
export function monthYear(t: ISODateTime): string {
  return monthYearFmt.format(new Date(t))
}

export function clockTime(t: ISODateTime): string {
  return timeFmt.format(new Date(t))
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "12 Nov" */
export function relativeTime(t: ISODateTime, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(t).getTime())
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return shortDate(t.slice(0, 10))
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
