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
  const title = areaId ? `Rentals around ${areaName(areaId)}` : 'Rentals across Bhopal'
  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="reveal flex flex-wrap items-end justify-between gap-4">
        <h2 id="featured-title" className="text-3xl tracking-tight sm:text-5xl">
          {title}
        </h2>
        <ButtonLink to={areaId ? `/browse?areas=${areaId}` : '/browse'} variant="outline" size="sm">
          See everything
        </ButtonLink>
      </div>
      {failed ? (
        <p className="mt-6 text-muted">Listings didn’t load. Refresh the page to try again.</p>
      ) : (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {listings
            ? listings.map((l, i) => <ListingCard key={l.id} listing={l} priority={i < 4} />)
            : Array.from({ length: 8 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      )}
    </section>
  )
}
