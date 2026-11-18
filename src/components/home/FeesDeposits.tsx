import { Link } from 'react-router'
import { DEPOSIT_CAPS, POLICY } from '@shared/policy'
import { BUSINESS, whatsappUrl } from '@/config/business'
import { BOOKING_FEE_LIVE, ID_CHECK_LIVE } from '@/lib/features'
import { rupees } from '@/lib/format'

const WHATSAPP = whatsappUrl()

/**
 * "What you pay": the booking fee, free listing, rental shops, and the deposit
 * rules. All numbers come from shared/policy.ts. The fee only appears once
 * online payments are switched on (BOOKING_FEE_LIVE); until then booking is free.
 */
export function FeesDeposits() {
  const fee = rupees(POLICY.bookingFee)
  const covers = ID_CHECK_LIVE ? 'ID checks, the pickup and return photo record, and our help if something goes wrong' : 'the pickup and return photo record, and our help if something goes wrong'
  const cards = [
    {
      who: 'Renting something',
      price: BOOKING_FEE_LIVE ? `${fee} booking fee` : 'Free to book',
      text: BOOKING_FEE_LIVE
        ? `Paid online only after the owner accepts. It covers ${covers}. Rent and deposit go straight to the owner at pickup.`
        : 'No booking fee while we’re starting out. Rent and deposit go straight to the owner at pickup.',
      highlight: true,
    },
    { who: 'Listing your things', price: 'Free', text: 'No listing fee and no commission while we’re starting out. You set your own price, and a deposit up to our limit.' },
    {
      who: 'Rental shops',
      price: 'Talk to us',
      text: (
        <>
          Run a rental shop in Bhopal?{' '}
          {WHATSAPP ? (
            <a href={WHATSAPP} rel="noopener noreferrer" className="font-semibold text-text underline underline-offset-4">
              WhatsApp us
            </a>
          ) : (
            'Get in touch'
          )}{' '}
          about listing your stock.
        </>
      ),
    },
  ]
  const rules = [
    { title: 'Capped by item', text: `Owners can’t ask more than our limit for that kind of item: for example, ${rupees(DEPOSIT_CAPS.cameras!)} at most for a camera.` },
    { title: `Back within ${POLICY.depositReturnHours} hours`, text: `The full deposit comes back within ${POLICY.depositReturnHours} hours of the return, unless damage is reported with photos.` },
    { title: 'Photos settle it', text: 'The pickup and return photos are the record, and RentiGoo decides from them. Anyone who breaks the rules is rated down or removed.' },
  ]
  return (
    <section aria-labelledby="fees-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="fees-title" className="text-3xl sm:text-5xl">
        What you pay
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted">Listing is free. Everything you pay is shown before you confirm: koi chhupa charge nahi.</p>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.who} className={c.highlight ? 'rounded-[24px] bg-accent p-6 text-on-accent light-scope' : 'rounded-[24px] bg-sunken p-6'}>
            <p className="font-semibold">{c.who}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{c.price}</p>
            <p className={c.highlight ? 'mt-2' : 'mt-2 text-muted'}>{c.text}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-12 text-2xl sm:text-3xl">Deposit rules</h3>
      <ul className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-3">
        {rules.map((r) => (
          <li key={r.title} className="border-t-2 border-ink pt-4">
            <p className="text-lg font-semibold">{r.title}</p>
            <p className="mt-1 text-muted">{r.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-muted">
        Questions?{' '}
        {WHATSAPP && (
          <>
            <a href={WHATSAPP} rel="noopener noreferrer" className="font-semibold text-text underline underline-offset-4">
              WhatsApp us
            </a>{' '}
            or{' '}
          </>
        )}
        call{' '}
        <a href={`tel:${BUSINESS.supportPhone?.replace(/\s/g, '')}`} className="font-semibold whitespace-nowrap text-text underline underline-offset-4">
          {BUSINESS.supportPhone}
        </a>
        . Full details are in our{' '}
        <Link to="/terms" className="font-semibold text-text underline underline-offset-4">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/refunds" className="font-semibold text-text underline underline-offset-4">
          Cancellation and refunds
        </Link>
        .
      </p>
    </section>
  )
}
