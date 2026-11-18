import type { Listing } from '@shared/types'
import { areaName, LAUNCH_CITY } from '@shared/areas'
import { ButtonLink } from '../ui/Button'
import { ListingCard, ListingCardSkeleton } from '../listing/ListingCard'

interface Props {
  /** Undefined while loading. */
  listings: Listing[] | undefined
  areaId?: string
  failed?: boolean
}

export function FeaturedListings({ listings, areaId, failed }: Props) {
  const title = areaId ? `Rentals around ${areaName(areaId)}` : `Rentals across ${LAUNCH_CITY}`
  const empty = listings?.length === 0
  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="featured-title" className="text-3xl sm:text-5xl">
          {title}
        </h2>
        {!empty && (
          <ButtonLink to={areaId ? `/browse?areas=${areaId}` : '/browse'} variant="outline" size="sm">
            See all
          </ButtonLink>
        )}
      </div>
      {failed ? (
        <p className="mt-6 text-muted">Listings didn’t load. Refresh the page to try again.</p>
      ) : empty ? (
        <div className="mt-6 rounded-[24px] bg-sunken p-6 sm:p-8">
          <p className="text-xl font-semibold">Nothing listed yet.</p>
          <p className="mt-2 max-w-xl text-muted">We’ve just started in {LAUNCH_CITY}. Listing is free.</p>
          <ButtonLink to="/list" className="mt-5">
            List an item
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {listings
            ? listings.map((l, i) => <ListingCard key={l.id} listing={l} priority={i < 4} />)
            : Array.from({ length: 4 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      )}
    </section>
  )
}
