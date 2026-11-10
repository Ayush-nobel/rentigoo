import { FEES } from '@shared/fees'
import type { PriceQuote } from '@shared/types'
import { plural, rupees } from '@/lib/format'
import { cx } from '@/lib/cx'

/** Every rupee the renter pays, line by line. */
export function PriceBreakdown({ quote, className }: { quote: PriceQuote; className?: string }) {
  const rows: { label: string; value: string; tone?: 'saving' }[] = [
    { label: `${rupees(quote.dailyRate)} × ${plural(quote.days, 'day')}`, value: rupees(quote.undiscountedSubtotal) },
  ]
  if (quote.longStayDiscount > 0) rows.push({ label: 'Weekly/monthly rate saving', value: `−${rupees(quote.longStayDiscount)}`, tone: 'saving' })
  rows.push({ label: `Service fee (${FEES.serviceFeePct}%)`, value: rupees(quote.serviceFee) })
  rows.push({ label: `GST on service fee (${FEES.gstOnFeePct}%)`, value: rupees(quote.gstOnFee) })
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
              Rent total
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
            <td className="pt-3 text-right font-display text-xl font-bold tabular-nums">{rupees(quote.totalDue)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[0.9375rem] text-muted">
        Pay the owner at pickup by UPI or cash. {quote.refundableDeposit > 0 ? `The ${rupees(quote.refundableDeposit)} deposit comes back when the item does.` : 'No deposit needed.'}
      </p>
    </div>
  )
}
