import { LEGAL } from '@shared/legal'
import { DEPOSIT_CAPS, POLICY } from '@shared/policy'
import { L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'
import { BOOKING_FEE_LIVE } from '@/lib/features'
import { rupees } from '@/lib/format'

const fee = rupees(POLICY.bookingFee)

const sections: LegalSection[] = [
  {
    id: 'now',
    title: 'How money works today',
    body: BOOKING_FEE_LIVE ? (
      <p>
        Sending a request is free. Once the owner accepts, you pay RentiGoo a {fee} booking fee online to lock in the dates. The rent and the deposit you pay the
        owner directly at pickup. So the only money RentiGoo ever refunds is the booking fee; the rest of this policy explains what happens between renter and owner.
      </p>
    ) : (
      <p>
        RentiGoo doesn’t take online payments yet. You don’t pay anything when you request or when the owner accepts. You pay the owner the “Due at pickup”
        amount when you collect the item. Because RentiGoo doesn’t hold your money, there is nothing for RentiGoo to refund today. This policy explains what
        happens between renter and owner.
      </p>
    ),
  },
  {
    id: 'renter-cancels',
    title: 'If you’re the renter and want to cancel',
    body: (
      <ul>
        <li>
          You can cancel a request, or an accepted booking, from your dashboard at any time before pickup.{' '}
          {BOOKING_FEE_LIVE ? `If you’ve already paid the ${fee} booking fee, it isn’t refunded when you cancel.` : 'It costs nothing, because you haven’t paid.'}
        </li>
        <li>Please cancel as early as you can and message the owner, so they can rent to someone else.</li>
        <li>
          After pickup, a booking by the day can’t be cancelled. Return the item early if you like; the owner doesn’t have to refund unused days, but may
          choose to. Monthly rentals can be ended early with notice (see below).
        </li>
      </ul>
    ),
  },
  {
    id: 'owner-cancels',
    title: 'If you’re the owner and need to cancel',
    body: (
      <ul>
        <li>
          You can decline any request, or cancel an accepted booking before pickup, from your dashboard.{' '}
          {BOOKING_FEE_LIVE
            ? `If the renter has paid the ${fee} booking fee, RentiGoo refunds it in full, to the way they paid. The same happens if an owner closes their account. Banks usually take 5 to 7 working days to show a refund.`
            : 'The renter isn’t charged.'}
        </li>
        <li>Tell the renter why, as early as you can. Owners who cancel accepted bookings often may have their account suspended.</li>
      </ul>
    ),
  },
  {
    id: 'monthly',
    title: 'Monthly rentals',
    body: (
      <ul>
        <li>Before pickup, either of you can cancel a monthly booking free, as above.</li>
        <li>
          After pickup, either of you can give notice from the dashboard. The rental ends one month after the day notice is given. Nothing more is due for the
          months after that, and a shortened last month is charged per day at the monthly price ÷ 30.
        </li>
        <li>
          Because each month is paid when it starts, ending with notice never means paying for a month you don’t get. If the owner agrees to end it sooner than a
          month, they decide whether to return rent already paid for the days after the item comes back.
        </li>
        <li>The deposit is returned when the item comes back, as for any rental.</li>
      </ul>
    ),
  },
  {
    id: 'deposits',
    title: 'Deposits',
    body: (
      <ul>
        <li>
          Deposits are capped by kind of item: for example, at most {rupees(DEPOSIT_CAPS.cameras!)} for a camera. The listing shows the deposit before you ask.
        </li>
        <li>
          When the item comes back in the same condition (apart from normal wear), the owner returns the full deposit within {POLICY.depositReturnHours} hours of the
          return.
        </li>
        <li>
          For damage or missing parts, the owner must tell RentiGoo within {POLICY.damageReportHours} hours of the return, with photos. They may keep only the
          reasonable cost of repair or replacement, and must show the renter the bill or a written quote.
        </li>
        <li>
          If you can’t agree, RentiGoo decides, using the pickup and return photos on the booking and anything else you both send us. Contact our grievance officer
          (details on the <L to="/contact">Contact page</L>); we acknowledge complaints within 24 hours. This doesn’t affect your rights under consumer law.
        </li>
      </ul>
    ),
  },
  {
    id: 'problems',
    title: 'If the item isn’t as described',
    body: (
      <p>
        Check the item together at pickup. If it doesn’t match the listing or doesn’t work, you don’t have to take it or pay. Tell us through the grievance
        officer, so we can act on the listing.
      </p>
    ),
  },
  {
    id: 'later',
    title: 'When online payments start',
    body: BOOKING_FEE_LIVE ? (
      <p>The booking fee is the only payment RentiGoo takes online. If we ever take rent or deposits online, we’ll update this policy first and show a notice on your Account page.</p>
    ) : (
      <p>
        Before RentiGoo starts taking payments, we’ll update this policy with how and when refunds are made, and show a notice on your Account page.
      </p>
    ),
  },
]

export default function Refunds() {
  return (
    <LegalPage
      path="/refunds"
      title="Cancellation and Refund Policy"
      version={LEGAL.refunds.version}
      intro={
        <p>
          What happens to your money and deposit if plans change. This is part of our <L to={LEGAL.terms.path}>Terms and Conditions</L>.
        </p>
      }
      sections={sections}
    />
  )
}
