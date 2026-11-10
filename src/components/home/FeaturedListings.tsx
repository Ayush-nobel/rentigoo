import type { Listing } from '@shared/types'
import { areaName } from '@shared/areas'
import { ButtonLink } from '../ui/Button'
import { ListingCard, ListingCardSkeleton } from '../listing/ListingCard'

interface Props {
  listings: Listing[] | undefined
  areaId?: string
  failed?: boolean
}

export function FeaturedListings({ listings, areaId, failed }: Props) {
  const title = areaId ? `Popular around ${areaName(areaId)}` : 'Popular across Bhopal'
  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="featured-title" className="text-3xl sm:text-4xl">
          {title}
        </h2>
        <ButtonLink to={areaId ? `/browse?areas=${areaId}` : '/browse'} variant="outline" size="sm">
          See everything
        </ButtonLink>
      </div>
      {failed ? (
        <p className="mt-6 text-muted">Listings didn’t load. Refresh the page to try again.</p>
      ) : (
        <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {listings
            ? listings.map((l, i) => <ListingCard key={l.id} listing={l} priority={i < 4} />)
            : Array.from({ length: 8 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      )}
    </section>
  )
}
