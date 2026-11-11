import { FEES } from './fees'
import { monthSchedule, termOf } from './pricing'
import type { Booking, ISODate, OwnerStats } from './types'

/**
 * An owner's numbers. Rent counts once it's in: a whole daily rental when it's
 * marked returned; each month of a monthly rental when it's marked paid.
 */
export function ownerStatsFrom(bookings: Booking[], month: string, fees = FEES): OwnerStats {
  const keep = (rent: number) => rent - Math.round((rent * fees.ownerCommissionPct) / 100)
  const earnings: { when: ISODate; amount: number }[] = []
  for (const b of bookings) {
    if (termOf(b.quote) === 'months') {
      if (b.status !== 'active' && b.status !== 'completed') continue
      const paid = monthSchedule(b.start, b.end, b.quote.monthlyRate!).slice(0, b.paidMonths ?? 0)
      paid.forEach((p, i) => earnings.push({ when: p.start, amount: keep(p.amount) + (i === 0 ? b.quote.deliveryFee : 0) }))
    } else if (b.status === 'completed') {
      earnings.push({ when: b.end, amount: b.quote.ownerPayout })
    }
  }
  return {
    earnedThisMonth: earnings.filter((e) => e.when.startsWith(month)).reduce((s, e) => s + e.amount, 0),
    earnedTotal: earnings.reduce((s, e) => s + e.amount, 0),
    pendingRequests: bookings.filter((b) => b.status === 'requested').length,
    activeRentals: bookings.filter((b) => b.status === 'active').length,
    upcomingRentals: bookings.filter((b) => b.status === 'accepted').length,
  }
}
