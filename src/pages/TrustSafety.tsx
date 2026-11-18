import { Link } from 'react-router'
import { BUSINESS } from '@/config/business'
import { ID_CHECK_LIVE, PHONE_CHECK_LIVE } from '@/lib/features'
import { ContentPage, Points, Section } from '@/components/content/Content'
import { Seo } from '@/components/layout/Seo'
import { STATIC_PAGES } from '@/lib/seo'
import { breadcrumbs } from '@/lib/structuredData'

export default function TrustSafety() {
  const g = BUSINESS.grievanceOfficer
  return (
    <>
      <Seo
        {...STATIC_PAGES['/trust-and-safety']!}
        jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Trust and safety', path: '/trust-and-safety' }])].filter((x): x is object => x !== null)}
      />
      <ContentPage
        title="Trust and safety"
        intro={<p>RentiGoo is new. We’d rather tell you exactly what we check and what we don’t than make promises we can’t keep. Here’s where things stand today.</p>}
      >
        <Section id="we-do" title="What we do today">
          <Points
            tone="yes"
            items={[
              'Everyone confirms their email address before they can rent or list.',
              'At pickup and at return, owner and renter can each record a checklist and up to 6 photos on the booking. Both see both, and it’s the first thing we look at in a damage dispute. They’re private, and deleted 30 days after the rental ends.',
              ...(ID_CHECK_LIVE
                ? ['People can check their ID through DigiLocker, the government’s document app, and get an “ID checked” badge. We check the name matches their profile and keep only that it was checked, never the ID details. It’s optional.']
                : []),
              ...(PHONE_CHECK_LIVE
                ? ['People can check their mobile number with a one-time code. Those who do get a “Phone number checked” badge. It’s optional, so its absence isn’t a warning sign.']
                : []),
              'Reviews can only be written after a rental is completed, once per person per rental, and can’t be edited afterwards. Nobody can review a rental that didn’t happen.',
              'Prices are worked out by our server from the listing, and a booking keeps the price from the moment you asked, even if the owner changes it later.',
              'Messages always show who really sent them, and can’t be changed once sent.',
              'Photos are resized in your browser before upload, which removes hidden details like the location your phone saves in pictures.',
              'Only the two people in a booking or a conversation can see it.',
            ]}
          />
        </Section>

        <Section id="we-dont" title="What we don’t do (yet)">
          <Points
            tone="no"
            items={[
              ...(ID_CHECK_LIVE
                ? []
                : [PHONE_CHECK_LIVE ? 'We don’t check government IDs.' : 'We don’t check government IDs or phone numbers.']),
              ...(ID_CHECK_LIVE && !PHONE_CHECK_LIVE ? ['We don’t check phone numbers yet.'] : []),
              'We don’t hold payments or deposits. Money passes directly between renter and owner at pickup.',
              'We don’t insure items, and we don’t guarantee that an owner or renter will do what they agreed.',
            ]}
          />
          <p>When any of this changes, we’ll update this page and our <Link to="/terms">Terms</Link> first.</p>
        </Section>

        <Section id="renters" title="Staying safe as a renter">
          <Points
            items={[
              'Read the owner’s reviews and message them before you request.',
              'For a first rental, meet somewhere public or in a building lobby, in daylight if you can.',
              'Bring a government photo ID to show the owner. Check the item works before you hand over any money, and add the pickup check with photos to the booking (Dashboard → the booking → Pickup and return photos).',
              'Pay only when you have the item in hand. Never pay in advance or through a link someone sends you.',
            ]}
          />
        </Section>

        <Section id="owners" title="Staying safe as an owner">
          <Points
            items={[
              'Set a deposit that would cover a repair, not the whole item. Renters are more likely to book.',
              'Ask to see the renter’s government photo ID, then do the pickup check together: tick the checklist and photograph the item, including any existing marks. Do the same when it comes back, and report damage within 24 hours.',
              'Hand it over only after you’ve received the rent and deposit.',
              'Write your rules into the listing, so renters agree to them before they ask.',
            ]}
          />
        </Section>

        <Section id="scams" title="Signs of a scam">
          <Points
            items={[
              'Someone asks for an OTP, your UPI PIN or bank details. Nobody genuine needs these. We will never ask for them either.',
              'Someone wants payment before you’ve seen the item, or asks you to pay through a link.',
              'Someone pushes to move the conversation off RentiGoo straight away. Keeping messages here means there’s a record if something goes wrong.',
              'A price that seems far too good for what’s on offer.',
            ]}
          />
        </Section>

        <Section id="problems" title="If something goes wrong">
          <p>
            <strong>Damage or a deposit dispute:</strong> tell the other person straight away and take photos. Normal wear is expected. For real damage, the owner can keep part of the
            deposit to cover the repair and must show you the bill or quote.
          </p>
          <p>
            <strong>Can’t agree, or want to report someone:</strong> contact our grievance officer, {g.name} ({g.designation}), at{' '}
            <a href={`mailto:${g.email}`}>{g.email}</a>
            {g.phone ? (
              <>
                {' '}
                or <a href={`tel:${g.phone.replace(/\s/g, '')}`}>{g.phone}</a>
              </>
            ) : null}
            . We acknowledge every complaint within 24 hours and aim to resolve it within 15 days. More on our <Link to="/contact">Contact and complaints</Link> page.
          </p>
          <p>
            <strong>If you’re in danger,</strong> call 112 first.
          </p>
        </Section>
      </ContentPage>
    </>
  )
}
