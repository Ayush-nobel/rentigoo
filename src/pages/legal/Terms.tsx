import { LAUNCH_CITY } from '@shared/areas'
import { FEES } from '@shared/fees'
import { LEGAL, MIN_AGE } from '@shared/legal'
import { BusinessContact, L, LegalPage, type LegalSection } from '@/components/legal/LegalPage'
import { BUSINESS, shown } from '@/config/business'

/*
 * Keep in step with how the product works. Anything marked "rule" here should
 * match code (shared/bookingRules.ts, amplify/functions/logic/*). Bump
 * LEGAL.terms.version in shared/legal.ts when the meaning changes.
 */
const sections: LegalSection[] = [
  {
    id: 'about',
    title: 'About RentiGoo and these terms',
    body: (
      <>
        <p>
          RentiGoo is an online marketplace, run by {shown(BUSINESS.legalName, 'Legal name')}, where people in {LAUNCH_CITY} list things they own and rent
          them to each other. These terms are the agreement between you and us when you use RentiGoo.
        </p>
        <p>
          RentiGoo is a platform, not a rental shop. We don’t own, inspect or store the items. When an owner accepts your request, the rental agreement is
          between you and the owner. We provide the tools, the rules in these terms, and a way to raise problems with us.
        </p>
        <p>
          By creating an account, you agree to these terms and to our <L to={LEGAL.privacy.path}>Privacy Policy</L>.
        </p>
      </>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <ul>
        <li>You must be {MIN_AGE} or older.</li>
        <li>Use your real name and keep your details accurate. One account per person.</li>
        <li>Keep your password private. You’re responsible for what happens under your account.</li>
        <li>
          You can delete your account at any time from <L to="/account">Account</L>.
        </li>
      </ul>
    ),
  },
  {
    id: 'listing',
    title: 'Listing an item (for owners)',
    body: (
      <>
        <p>When you list something, you confirm that:</p>
        <ul>
          <li>It’s yours, or you have the right to rent it out.</li>
          <li>It’s safe, legal to rent, works as described, and the photos and description are honest and up to date.</li>
          <li>The price, deposit and rules you set are the ones you’ll stick to.</li>
        </ul>
        <h3>Things you can’t list</h3>
        <ul>
          <li>Anything illegal to own, rent or sell in India, or anything stolen.</li>
          <li>Weapons, ammunition, explosives, fireworks and hazardous substances.</li>
          <li>Medicines, drugs, alcohol and tobacco.</li>
          <li>Motor vehicles, and anything that needs a licence or permit to use that the renter can’t show you.</li>
          <li>Animals, people’s services, real estate and financial products.</li>
          <li>Items that are unsafe, recalled, or that infringe someone else’s rights (for example, counterfeit goods).</li>
        </ul>
        <p>We may remove a listing that breaks these rules or the law, and we act on lawful orders to remove content.</p>
      </>
    ),
  },
  {
    id: 'booking',
    title: 'Booking and renting',
    body: (
      <>
        <ol className="steps">
          <li>You choose dates and send a request. Before you send it, you see the full price breakdown, including any fees and the deposit.</li>
          <li>The owner accepts or declines. Nothing is agreed until they accept.</li>
          <li>You arrange pickup or delivery through Messages. At handover, check the item together.</li>
          <li>You use it with care, keep to the owner’s rules, and return it on time, in the condition you got it (apart from normal wear).</li>
        </ol>
        <p>If you can’t return the item on time, tell the owner straight away. Each extra day is charged at the listing’s daily rate unless the owner agrees otherwise.</p>
      </>
    ),
  },
  {
    id: 'money',
    title: 'Prices, fees and payment',
    body: (
      <>
        <p>
          Every price is in Indian rupees. The breakdown before you request shows the rent, any weekly or monthly saving, any delivery fee, and the refundable
          deposit. We never add charges after you request.
        </p>
        {FEES.serviceFeePct === 0 && FEES.ownerCommissionPct === 0 ? (
          <p>
            <strong>Fees:</strong> RentiGoo currently charges no service fee to renters and takes no commission from owners. Listing is free. If we introduce
            fees, we’ll update these terms first and show every fee in the breakdown before you request.
          </p>
        ) : (
          <p>
            <strong>Fees:</strong> renters pay RentiGoo’s service fee ({FEES.serviceFeePct}% of the rent){FEES.gstOnFeePct > 0 ? ' with GST on that fee' : ''},
            shown in the breakdown. Owners pay a commission of {FEES.ownerCommissionPct}% of the rent they earn. Listing is free.
          </p>
        )}
        <p>
          <strong>How you pay today:</strong> RentiGoo doesn’t take online payments yet. You pay the owner the “Due at pickup” amount when you collect the item,
          by UPI or cash, and the owner gives you back the deposit when you return it. We’ll update these terms before online payments start.
        </p>
      </>
    ),
  },
  {
    id: 'deposits',
    title: 'Deposits and damage',
    body: (
      <ul>
        <li>The owner sets the deposit, and it’s shown before you request.</li>
        <li>When the item comes back in the same condition (apart from normal wear), the owner must return the full deposit at the time of return.</li>
        <li>
          If the item comes back damaged or incomplete, the owner may keep only the reasonable cost of repair or replacement, and must show the renter the bill
          or a written quote.
        </li>
        <li>If you can’t agree, contact our grievance officer (section 12). We’ll look at what both of you send us.</li>
      </ul>
    ),
  },
  {
    id: 'cancel',
    title: 'Cancelling',
    body: (
      <p>
        See our <L to={LEGAL.refunds.path}>Cancellation and Refund Policy</L>.
      </p>
    ),
  },
  {
    id: 'conduct',
    title: 'How everyone should behave',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Post anything unlawful, false or misleading, or that harasses, threatens, discriminates against or invades the privacy of anyone.</li>
          <li>Impersonate anyone, or use someone else’s account.</li>
          <li>Write fake reviews, pay or ask for reviews, or review a rental you weren’t part of.</li>
          <li>Upload malware, scrape the site, or try to get around our security or access rules.</li>
          <li>Use RentiGoo to contact people for anything other than renting.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'reviews',
    title: 'Reviews',
    body: (
      <ul>
        <li>Only the renter and owner of a completed rental can review it, once each.</li>
        <li>Reviews must be honest and about the rental. We don’t edit reviews, and we don’t hide reviews because they’re negative.</li>
        <li>We may remove a review that breaks these terms or the law, for example one with abuse or personal details.</li>
      </ul>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility',
    body: (
      <>
        <p>
          We work hard to keep RentiGoo running and safe, but we can’t promise it will always be available or error-free. Because the rental agreement is
          between renter and owner, we aren’t responsible for the condition, safety or legality of items, or for what renters and owners do, except where the
          law says we are.
        </p>
        <p>
          Nothing in these terms takes away rights you have under the Consumer Protection Act, 2019 or any other law that can’t be excluded by agreement.
        </p>
      </>
    ),
  },
  {
    id: 'suspend',
    title: 'Suspending or closing accounts',
    body: (
      <p>
        We may suspend or close an account, or remove content, if it breaks these terms or the law, or puts other people at risk. Where we can, we’ll tell you
        why and give you a chance to respond.
      </p>
    ),
  },
  {
    id: 'grievance',
    title: 'Complaints and grievance officer',
    body: (
      <>
        <p>
          If you have a complaint about RentiGoo, another user, or content on the site, contact our grievance officer. We acknowledge every complaint within 24
          hours and aim to resolve it within 15 days.
        </p>
        <BusinessContact />
        <p>
          You can also contact the National Consumer Helpline on 1915, or file a complaint with the consumer commission.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Law and disputes',
    body: (
      <p>
        These terms are governed by the laws of India. The courts at {shown(BUSINESS.jurisdictionCity, 'City')} have jurisdiction, without affecting your right
        to approach a consumer commission.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        If we change these terms in a way that matters, we’ll update the date at the top and show a notice on your Account page before the change applies to
        you. If you don’t agree, you can delete your account.
      </p>
    ),
  },
]

export default function Terms() {
  return (
    <LegalPage
      path="/terms"
      title="Terms and Conditions"
      version={LEGAL.terms.version}
      intro={<p>The rules for renting and lending on RentiGoo, in plain language. Please read them before you use the site.</p>}
      sections={sections}
    />
  )
}
