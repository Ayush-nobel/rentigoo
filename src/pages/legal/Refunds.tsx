import { LEGAL } from '@shared/legal'
import { L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'

const sections: LegalSection[] = [
  {
    id: 'now',
    title: 'How money works today',
    body: (
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
        <li>You can cancel a request, or an accepted booking, from your dashboard at any time before pickup. It costs nothing, because you haven’t paid.</li>
        <li>Please cancel as early as you can and message the owner, so they can rent to someone else.</li>
        <li>After pickup, a booking can’t be cancelled. Return the item early if you like; the owner doesn’t have to refund unused days, but may choose to.</li>
      </ul>
    ),
  },
  {
    id: 'owner-cancels',
    title: 'If you’re the owner and need to cancel',
    body: (
      <ul>
        <li>You can decline any request, or cancel an accepted booking before pickup, from your dashboard. The renter isn’t charged.</li>
        <li>Tell the renter why, as early as you can. Owners who cancel accepted bookings often may have their account suspended.</li>
      </ul>
    ),
  },
  {
    id: 'deposits',
    title: 'Deposits',
    body: (
      <ul>
        <li>When the item comes back in the same condition (apart from normal wear), the owner returns the full deposit at the time of return.</li>
        <li>
          For damage or missing parts, the owner may keep only the reasonable cost of repair or replacement, and must show the renter the bill or a written
          quote.
        </li>
        <li>
          If you can’t agree, contact our grievance officer (details on the <L to="/contact">Contact page</L>). We acknowledge complaints within 24 hours.
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
    body: (
      <p>
        Before RentiGoo starts taking payments, we’ll update this policy with how and when refunds are made, and show a notice on your Account page.
      </p>
    ),
  },
]

export default function Refunds() {
  return (
    <LegalPage
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
