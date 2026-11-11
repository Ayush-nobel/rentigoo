import { FEES } from '@shared/fees'
import { addMonths, termOf } from '@shared/pricing'
import type { ISODate, PriceQuote } from '@shared/types'
import { plural, rupees, shortDate } from '@/lib/format'
import { cx } from '@/lib/cx'

/** Every rupee the renter pays, line by line. Monthly rentals also say what's due each month. */
export function PriceBreakdown({ quote, start, className }: { quote: PriceQuote; start?: ISODate; className?: string }) {
  const monthly = termOf(quote) === 'months'
  const rows: { label: string; value: string; tone?: 'saving' }[] = [
    monthly
      ? { label: `${rupees(quote.monthlyRate!)} × ${plural(quote.months!, 'month')}`, value: rupees(quote.rentalSubtotal) }
      : { label: `${rupees(quote.dailyRate)} × ${plural(quote.days, 'day')}`, value: rupees(quote.undiscountedSubtotal) },
  ]
  if (quote.longStayDiscount > 0) rows.push({ label: 'Weekly/monthly rate saving', value: `−${rupees(quote.longStayDiscount)}`, tone: 'saving' })
  if (quote.serviceFee > 0) rows.push({ label: `Service fee (${FEES.serviceFeePct}%)`, value: rupees(quote.serviceFee) })
  // Only shown when GST applies (RentiGoo isn't GST-registered yet, so it's 0).
  if (quote.gstOnFee > 0) rows.push({ label: `GST on service fee (${FEES.gstOnFeePct}%)`, value: rupees(quote.gstOnFee) })
  if (quote.deliveryFee > 0) rows.push({ label: 'Delivery', value: rupees(quote.deliveryFee) })

  return (
    <div className={className}>
      <table className="w-full text-left">
        <caption className="sr-only">Price breakdown</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="py-1 font-normal">
                {r.label}
              </th>
              <td className={cx('py-1 text-right tabular-nums', r.tone === 'saving' && 'font-semibold text-success')}>{r.value}</td>
            </tr>
          ))}
          <tr className="border-t border-line">
            <th scope="row" className="pt-2.5 pb-1 font-semibold">
              {monthly ? `Rent for all ${plural(quote.months!, 'month')}` : 'Rent total'}
            </th>
            <td className="pt-2.5 pb-1 text-right font-semibold tabular-nums">{rupees(quote.totalRent)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-1 font-normal">
              Refundable deposit
            </th>
            <td className="py-1 text-right tabular-nums">{rupees(quote.refundableDeposit)}</td>
          </tr>
          <tr className="border-t border-line-strong">
            <th scope="row" className="pt-3 font-display text-xl font-bold">
              Due at pickup
            </th>
            <td className="pt-3 text-right font-display text-xl font-bold tabular-nums">{rupees(quote.dueAtPickup ?? quote.totalDue)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[0.9375rem] text-muted">
        {monthly
          ? `At pickup: the first month${quote.deliveryFee ? ', delivery' : ''}${quote.refundableDeposit ? ' and the deposit' : ''}. ${
              quote.months! > 1
                ? `Then ${rupees(quote.monthlyRate!)} at the start of each month${start ? `, from ${shortDate(addMonths(start, 1))}` : ''}, paid to the owner by UPI or cash.`
                : ''
            } Either of you can end it early with a month’s notice.`
          : 'Pay the owner at pickup by UPI or cash.'}{' '}
        {quote.refundableDeposit > 0 ? `The ${rupees(quote.refundableDeposit)} deposit comes back when the item does.` : 'No deposit needed.'}
      </p>
    </div>
  )
}
