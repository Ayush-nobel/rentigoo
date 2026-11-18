import { Link } from 'react-router'
import { FEES } from '@shared/fees'
import { POLICY } from '@shared/policy'
import { BOOKING_FEE_LIVE } from '@/lib/features'
import { rupees } from '@/lib/format'

const free = FEES.serviceFeePct === 0 && FEES.ownerCommissionPct === 0

/**
 * The money, in one place: what the renter pays, when, to whom, and what
 * happens to the deposit. Used on Home and on How it works, so they never differ.
 * Keep in step with the Terms ("Paying" and "Deposits and damage").
 */
export function HowPayingWorks({ headingId = 'paying-title', className, heading = true }: { headingId?: string; className?: string; heading?: boolean }) {
  const fee = rupees(POLICY.bookingFee)
  const rows: [string, React.ReactNode][] = [
    ['What you pay', 'The rent for your dates and a refundable deposit, plus a delivery fee if you choose delivery. The listing shows every amount before you ask.'],
    [
      'When',
      BOOKING_FEE_LIVE
        ? `Nothing when you send a request. Once the owner accepts, a ${fee} booking fee online. The rent and deposit at pickup, once you’ve seen the item works.`
        : 'Nothing when you send a request. You pay at pickup, once you’ve seen the item and it works.',
    ],
    ['To whom', `Rent and deposit straight to the owner, by UPI or cash.${BOOKING_FEE_LIVE ? ` The ${fee} booking fee to RentiGoo.` : free ? ' RentiGoo takes nothing right now.' : ''}`],
    ['The deposit', `Capped by kind of item, and back in full within ${POLICY.depositReturnHours} hours of the return, unless damage is reported with photos.`],
    [
      'If something breaks',
      <>
        The owner can keep only what the repair or replacement costs, with a bill or written quote. If you don’t agree, RentiGoo decides from the pickup and return
        photos on the booking. <Link to="/terms#deposits" className="underline underline-offset-4">The rules in full</Link>
      </>,
    ],
  ]
  const table = (
    <dl className={`${heading ? 'mt-6 ' : ''}divide-y divide-line rounded-[24px] border-2 border-ink`}>
        {rows.map(([term, text]) => (
          <div key={term} className="grid gap-1 p-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-muted">{text}</dd>
          </div>
        ))}
    </dl>
  )
  const monthly = <p className="mt-4 text-[0.9375rem] text-muted">Renting by the month? You pay the first month and the deposit at pickup, then each month’s rent as it starts.</p>
  if (!heading) return <div className={className}>{table}{monthly}</div>
  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-3xl sm:text-5xl">
        How paying works
      </h2>
      {table}
      {monthly}
    </section>
  )
}
