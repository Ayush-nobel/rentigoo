import type { Listing } from '@shared/types'
import { areaName, LAUNCH_CITY } from '@shared/areas'
import { Link } from 'react-router'
import { whatsappUrl } from '@/config/business'
import { ButtonLink } from '../ui/Button'
import { ListingCard, ListingCardSkeleton } from '../listing/ListingCard'
import { RequestForm } from './RequestForm'

interface Props {
  /** Undefined while loading. */
  listings: Listing[] | undefined
  areaId?: string
  failed?: boolean
}

const WHATSAPP = whatsappUrl()

export function FeaturedListings({ listings, areaId, failed }: Props) {
  const title = areaId ? `Rentals around ${areaName(areaId)}` : `Rentals across ${LAUNCH_CITY}`
  const empty = listings?.length === 0
  // No listings yet: ask what people need instead of showing an empty heading.
  if (empty) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <RequestForm />
        <p className="mt-4 text-muted">
          Own something others could rent?{' '}
          <Link to="/list" className="font-semibold text-text underline underline-offset-4">
            List it for free
          </Link>
          .
        </p>
      </div>
    )
  }
  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="featured-title" className="text-3xl sm:text-5xl">
          {title}
        </h2>
        <ButtonLink to={areaId ? `/browse?areas=${areaId}` : '/browse'} variant="outline" size="sm">
          See all
        </ButtonLink>
      </div>
      {failed ? (
        <p className="mt-6 text-muted">Listings didn’t load. Refresh the page to try again.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {listings
              ? listings.map((l, i) => <ListingCard key={l.id} listing={l} priority={i < 3} tag="lg" />)
              : Array.from({ length: 3 }, (_, i) => <ListingCardSkeleton key={i} />)}
          </div>
          {listings && (
            <p className="mt-8 text-muted">
              Can’t find it?{' '}
              {WHATSAPP ? (
                <a href={WHATSAPP} rel="noopener noreferrer" className="font-semibold text-text underline underline-offset-4">
                  Tell us on WhatsApp
                </a>
              ) : (
                'Tell us'
              )}{' '}
              and we’ll look for someone nearby who has it.
            </p>
          )}
        </>
      )}
    </section>
  )
}
