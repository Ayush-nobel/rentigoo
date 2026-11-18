import { CalendarRange, MapPin, Truck } from 'lucide-react'
import { Link } from 'react-router'
import { headlinePrice, rentsByDay, rentsByMonth } from '@shared/pricing'
import { areaName } from '@shared/areas'
import type { Listing } from '@shared/types'
import { cx } from '@/lib/cx'
import { rupees } from '@/lib/format'
import { ListingImage } from '../ui/ListingImage'
import { PriceTag } from '../ui/PriceTag'
import { Rating } from '../ui/Rating'
import { Skeleton } from '../ui/Feedback'

interface ListingCardProps {
  listing: Listing
  priority?: boolean
  className?: string
  /** Size of the price tag on the photo. */
  tag?: 'md' | 'lg'
}

export function ListingCard({ listing, priority, className, tag = 'md' }: ListingCardProps) {
  const delivers = listing.pickupOptions.includes('delivery')
  return (
    <article className={cx('group relative', className)}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-photo">
        <ListingImage
          photo={listing.photos[0]}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <PriceTag {...headlinePrice(listing)} size={tag} className="absolute bottom-3 left-3" />
      </div>
      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-sans text-[1.0625rem] leading-snug font-semibold">
            {/* The link covers the whole card; the title is its accessible name. */}
            <Link to={`/listing/${listing.id}`} className="after:absolute after:inset-0 after:rounded-photo focus-visible:outline-none">
              {listing.title}
            </Link>
          </h3>
          <Rating value={listing.ratingAvg} count={listing.ratingCount} compact className="mt-0.5 shrink-0" />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-4" />
            {areaName(listing.areaId)}
          </span>
          {delivers && (
            <span className="inline-flex items-center gap-1">
              <Truck aria-hidden="true" className="size-4" />
              Delivers
            </span>
          )}
          {rentsByMonth(listing) && (
            <span className="inline-flex items-center gap-1">
              <CalendarRange aria-hidden="true" className="size-4" />
              {rentsByDay(listing) ? `Also ${rupees(listing.pricing.monthly!)} a month` : `${listing.months!.min}–${listing.months!.max} months`}
            </span>
          )}
        </p>
      </div>
      {/* Focus ring for the stretched link, drawn around the whole card. */}
      <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 hidden rounded-[24px] outline-2 outline-solid [outline-color:var(--focus)] group-has-[a:focus-visible]:block" />
    </article>
  )
}

export function ListingCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/3] rounded-photo" />
      <Skeleton className="mt-3 h-5 w-4/5" />
      <Skeleton className="mt-2 h-4 w-2/5" />
    </div>
  )
}
