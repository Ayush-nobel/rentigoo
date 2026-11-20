import { Link } from 'react-router'
import { POLICY } from '@shared/policy'
import { BUSINESS, whatsappUrl } from '@/config/business'
import { BOOKING_FEE_LIVE, ID_CHECK_LIVE } from '@/lib/features'
import { rupees } from '@/lib/format'

const WHATSAPP = whatsappUrl()
const EMAIL = BUSINESS.supportEmail

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
        ? `Paid online only after the owner accepts. It covers ${covers}. Rent and deposit are paid directly to the owner at pickup.`
        : 'No booking fee while we’re starting out. Rent and deposit are paid directly to the owner at pickup.',
      highlight: true,
    },
    { who: 'Listing your things', price: 'Free', text: 'No listing fee and no commission while we’re starting out. You set your own price, and a deposit up to the standard limit.' },
    {
      who: 'Rental shops',
      price: 'Talk to us',
      text: (
        <>
          Run a rental shop in Bhopal? Partner with us to reach customers online. Email{' '}
          <a href={`mailto:${EMAIL}`} className="font-semibold break-all text-text underline underline-offset-4">
            {EMAIL}
          </a>
          {WHATSAPP && (
            <>
              {' '}
              or{' '}
              <a href={WHATSAPP} rel="noopener noreferrer" className="font-semibold text-text underline underline-offset-4">
                message us on WhatsApp
              </a>
            </>
          )}{' '}
          to list your stock.
        </>
      ),
    },
  ]
  const rules = [
    {
      title: 'Standard deposit limit',
      text: `Owners can ask for a refundable deposit of up to ${POLICY.depositPctOfValue}% of what the item cost new, within the limit for its category. Items that cost more than ${rupees(POLICY.receiptAbove)} need the original bill, which only RentiGoo sees.`,
    },
    {
      title: `Back within ${POLICY.depositReturnHours} hours`,
      text: `The owner returns the deposit within ${POLICY.depositReturnHours} hours of the return, minus only damage that was reported with photos.`,
    },
    {
      title: 'Pickup and return photos',
      text: 'Owner and renter both photograph the item at pickup and return. These dated photos are the condition record if there’s a dispute. Anyone who breaks the rules can be suspended or removed.',
    },
  ]
  return (
    <section aria-labelledby="fees-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="fees-title" className="text-3xl sm:text-5xl">
        What you pay
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted">No hidden fees. Listing is free, and everything you pay is shown before you confirm.</p>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.who} className={c.highlight ? 'rounded-[24px] bg-accent p-6 text-on-accent light-scope' : 'card rounded-[24px] p-6'}>
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
        , or email{' '}
        <a href={`mailto:${EMAIL}`} className="font-semibold break-all text-text underline underline-offset-4">
          {EMAIL}
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
