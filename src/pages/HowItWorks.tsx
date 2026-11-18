import { Link } from 'react-router'
import { LAUNCH_CITY } from '@shared/areas'
import { FEES } from '@shared/fees'
import { LISTING_LIMITS } from '@shared/listingRules'
import { ContentPage, Section, Steps } from '@/components/content/Content'
import { HowPayingWorks } from '@/components/content/HowPayingWorks'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { STATIC_PAGES } from '@/lib/seo'
import { breadcrumbs } from '@/lib/structuredData'

const free = FEES.serviceFeePct === 0 && FEES.ownerCommissionPct === 0

export default function HowItWorks() {
  return (
    <>
      <Seo {...STATIC_PAGES['/how-it-works']!} jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: 'How it works', path: '/how-it-works' }])].filter((x): x is object => x !== null)} />
      <ContentPage
        title="How RentiGoo works"
        intro={<p>RentiGoo puts people in {LAUNCH_CITY} who need something for a few days in touch with neighbours who own it. Here’s the whole process, from both sides.</p>}
      >
        <Section id="renting" title="Renting something">
          <Steps
            steps={[
              { title: 'Find it', body: <p>Search by what you need, your area and your dates. Each listing shows the price per day, any weekly or monthly price, the deposit and the owner’s rules.</p> },
              {
                title: 'Send a request',
                body: <p>Pick your dates and you’ll see the full breakdown: rent, any delivery fee and the refundable deposit. Sending a request costs nothing. You can message the owner first if you have questions.</p>,
              },
              { title: 'The owner says yes (or no)', body: <p>If they accept, those dates are blocked for you. You still haven’t paid anything. Use Messages to agree a time and place for pickup.</p> },
              {
                title: 'Pick it up and pay',
                body: <p>Check the item together, then pay the rent and deposit to the owner directly, by UPI or cash. Take a couple of photos of its condition; it helps everyone if questions come up later.</p>,
              },
              { title: 'Bring it back', body: <p>Return it on time, in the condition you got it. The owner marks it as returned and gives you the deposit back.</p> },
              { title: 'Review each other', body: <p>Once it’s returned, you can both leave a review. Only people who actually completed a rental can review it.</p> },
            ]}
          />
          <ButtonLink to="/browse" className="mt-2">
            Find something to rent
          </ButtonLink>
        </Section>

        <Section id="monthly" title="Renting by the month">
          <p>
            Some things are better rented for months than days: a sofa, a fridge, a study table for the term. When an owner offers it, choose “By the month” on the
            listing, pick a start date and how many months you need, up to 12.
          </p>
          <Steps
            steps={[
              { title: 'At pickup', body: <p>Pay the first month’s rent and the deposit (and any delivery fee) to the owner.</p> },
              { title: 'Each month', body: <p>Pay that month’s rent when it starts, by UPI or cash. Your dashboard shows what’s due and when, and the owner marks each payment.</p> },
              {
                title: 'At the end',
                body: <p>Return the item and get your deposit back. Need to stop sooner? Either of you can give a month’s notice from the dashboard.</p>,
              },
            ]}
          />
        </Section>

        <Section id="listing" title="Listing something">
          <Steps
            steps={[
              {
                title: 'Create a listing',
                body: (
                  <p>
                    Add up to {LISTING_LIMITS.photosMax} photos and a clear description. Choose whether people rent it by the day, by the month, or both, and set your
                    prices, a deposit and how long they can have it. Block any days you need it yourself.
                  </p>
                ),
              },
              { title: 'Answer requests', body: <p>Requests show up in your dashboard. Accept the ones that suit you and decline the rest. Nobody can book without your yes.</p> },
              { title: 'Hand it over', body: <p>Meet the renter, check the item together and collect the rent and deposit. Mark it as handed over in your dashboard.</p> },
              { title: 'Get it back', body: <p>When it comes back as it left, give the deposit back in full and mark it as returned. Then review the renter.</p> },
            ]}
          />
          <ButtonLink to="/list" className="mt-2">
            List an item
          </ButtonLink>
        </Section>

        <Section id="money" title="Money">
          {free ? (
            <p>
              RentiGoo is free to use right now: no service fee for renters and no commission for owners. While payments happen in person at pickup, we don’t charge anything.
              We’ll update this page and our <Link to="/terms">Terms</Link> before that changes.
            </p>
          ) : (
            <p>
              Renters pay a {FEES.serviceFeePct}% service fee on the rent, and owners pay a {FEES.ownerCommissionPct}% commission. Both are shown before anyone commits.
            </p>
          )}
          <HowPayingWorks heading={false} />
          <p>Weekly and monthly prices are applied automatically when they work out cheaper, so longer rentals cost less per day.</p>
        </Section>

        <Section id="changes" title="If plans change">
          <p>
            Renters can cancel a request, or an accepted booking, any time before pickup. Owners can decline requests or cancel before pickup. Since nobody pays until pickup, nobody is
            charged for cancelling. The details are in our <Link to="/refunds">Cancellation and Refund Policy</Link>.
          </p>
          <p>
            More questions? See <Link to="/faq">questions and answers</Link>, or read how we approach <Link to="/trust-and-safety">trust and safety</Link>.
          </p>
        </Section>
      </ContentPage>
    </>
  )
}
