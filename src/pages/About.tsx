import { Link } from 'react-router'
import { AREAS, LAUNCH_CITY } from '@shared/areas'
import { FEES } from '@shared/fees'
import { BUSINESS } from '@/config/business'
import { ContentPage, Points, Section } from '@/components/content/Content'
import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'
import { STATIC_PAGES } from '@/lib/seo'
import { breadcrumbs, organization } from '@/lib/structuredData'

const free = FEES.serviceFeePct === 0 && FEES.ownerCommissionPct === 0

export default function About() {
  const founder = BUSINESS.grievanceOfficer
  const areas = AREAS.map((a) => a.name)
  return (
    <>
      <Seo
        {...STATIC_PAGES['/about']!}
        jsonLd={[organization(), breadcrumbs([{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }])].filter((x): x is object => x !== null)}
      />
      <ContentPage title="About RentiGoo" intro={<p>RentiGoo is a place to rent everyday things from people nearby, and to earn from the things you own. We’re starting in {LAUNCH_CITY}.</p>}>
        <Section id="why" title="Why rent from a neighbour">
          <p>
            Plenty of what we buy is for one occasion: a camera for a wedding, a drill for one shelf, a tent for a weekend in Pachmarhi. Afterwards it sits in a cupboard for most of
            the year.
          </p>
          <p>
            Renting it from someone nearby often costs far less than buying it, and the owner earns something from a thing they weren’t using. Fewer things get bought for a few
            days’ use. That’s the whole idea.
          </p>
        </Section>

        <Section id="who" title="Who runs it">
          <p>
            RentiGoo is run from {LAUNCH_CITY} by {founder.name}, its {founder.designation?.toLowerCase()}. It’s a small, new business: {BUSINESS.legalName},{' '}
            {BUSINESS.entityType?.charAt(0).toLowerCase()}
            {BUSINESS.entityType?.slice(1)}.
          </p>
          <p>
            You can reach us at <a href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a>. Our full details are on the <Link to="/contact">Contact</Link> page.
          </p>
        </Section>

        <Section id="how-we-work" title="How we try to run it">
          <Points
            items={[
              <>
                No hidden costs. You see the full price, deposit included, before you ask.{' '}
                {free ? <Link to="/how-it-works#money">It’s free to use right now.</Link> : <Link to="/how-it-works#money">Our fees are shown up front.</Link>}
              </>,
              'No ads, no tracking and no analytics. We don’t sell your data, and we don’t share it with advertisers.',
              <>
                You’re in control of your data: download it or delete your account from your account page at any time. The <Link to="/privacy">Privacy Policy</Link> explains the rest
                in plain language.
              </>,
              <>
                Honesty about what we check. Our <Link to="/trust-and-safety">trust and safety</Link> page says what we do, and what we don’t do yet.
              </>,
            ]}
          />
        </Section>

        <Section id="where" title="Where we are">
          <p>
            Today, listings are in {areas.slice(0, -1).join(', ')} and {areas.at(-1)}. More of {LAUNCH_CITY} will follow as people join.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink to="/browse">Find something to rent</ButtonLink>
            <ButtonLink to="/list" variant="outline">
              List an item
            </ButtonLink>
          </div>
        </Section>
      </ContentPage>
    </>
  )
}
