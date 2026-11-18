import { Link } from 'react-router'
import { POLICY } from '@shared/policy'
import { BOOKING_FEE_LIVE } from '@/lib/features'
import { rupees } from '@/lib/format'

// A real sequence, so numbered steps are honest here. The fee step appears only when online payments are on.
const fee = rupees(POLICY.bookingFee)
const STEPS = [
  { title: 'Request', body: 'Pick your dates and send a request. Nothing to pay yet.' },
  { title: 'Owner accepts', body: BOOKING_FEE_LIVE ? `Then you pay the ${fee} booking fee online to lock in the dates.` : 'Those dates are now yours. Still nothing to pay.' },
  { title: 'Pickup', body: 'Show the owner your ID and photograph the item together. Then pay the owner the rent and deposit.' },
  { title: 'Return', body: `Photograph it again. The owner returns your deposit within ${POLICY.depositReturnHours} hours.` },
]

/** The steps in one row: a plain strip, not a set of cards. */
export function HowItWorksStrip() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="how-title" className="text-3xl sm:text-5xl">
        How it works
      </h2>
      <ol className="mt-8 grid gap-6 border-y-2 border-ink py-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line">
        {STEPS.map((s, i) => (
          <li key={s.title} className="lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <p className="text-xl font-semibold">
              <span aria-hidden="true" className="mr-2 inline-grid size-8 place-items-center rounded-full bg-accent text-base text-on-accent">{i + 1}</span>
              {s.title}
            </p>
            <p className="mt-2 text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <Link to="/how-it-works" className="mt-5 inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
        More about how it works
      </Link>
    </section>
  )
}
