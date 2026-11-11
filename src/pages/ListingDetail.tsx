import { CalendarDays, ChevronRight, MapPin, PackageCheck, Truck, SearchX } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { areaName } from '@shared/areas'
import { categoryName } from '@shared/categories'
import { headlinePrice, rentsByDay, rentsByMonth } from '@shared/pricing'
import type { Condition, Listing } from '@shared/types'
import { BookingPanel } from '@/components/listing/BookingPanel'
import { ListingCard } from '@/components/listing/ListingCard'
import { OwnerCard } from '@/components/listing/OwnerCard'
import { PhotoGallery } from '@/components/listing/PhotoGallery'
import { Reviews } from '@/components/listing/Reviews'
import { PageLoading } from '@/components/layout/AppShell'
import { ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState } from '@/components/ui/Feedback'
import { PriceTag } from '@/components/ui/PriceTag'
import { Rating } from '@/components/ui/Rating'
import { Seo } from '@/components/layout/Seo'
import { useMemo } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useInitialData } from '@/lib/initialData'
import { loadListingPage, type ListingPageData } from '@/lib/listingPage'
import { listingMeta } from '@/lib/listingMeta'
import { plural, rupees } from '@/lib/format'

const CONDITION: Record<Condition, string> = {
  new: 'New, unused',
  'like-new': 'Like new',
  good: 'Good, light signs of use',
  fair: 'Fair, works fine but shows wear',
}

export default function ListingDetail() {
  const { id = '' } = useParams()
  const initial = useInitialData<ListingPageData>(`listing:${id}`)
  const page = useAsync(() => loadListingPage(id), [id], { initial })
  const authorsById = useMemo(() => new Map((page.data?.authors ?? []).map((u) => [u.id, u])), [page.data?.authors])

  if (page.status === 'loading') return <PageLoading />
  const notFoundSeo = <Seo title="Listing not available" description="" noindex />
  if (page.status === 'error') {
    return (
      <EmptyState title="This listing didn’t load" action={<ButtonLink to="/browse">Back to browsing</ButtonLink>}>
        {notFoundSeo}
        Check your connection and refresh the page.
      </EmptyState>
    )
  }
  if (!page.data) {
    return (
      <EmptyState
        icon={<SearchX aria-hidden="true" className="size-7" />}
        title="This listing isn’t available"
        action={<ButtonLink to="/browse">Find something similar</ButtonLink>}
      >
        {notFoundSeo}
        The owner may have paused or removed it.
      </EmptyState>
    )
  }

  const { listing, owner, reviews, related } = page.data

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 md:pb-0">
      <Seo {...listingMeta(listing)} image={undefined} />
      <nav aria-label="Breadcrumb" className="mb-4 text-[0.9375rem]">
        <ol className="flex flex-wrap items-center gap-1 text-muted">
          <li>
            <Link to="/browse" className="rounded hover:text-text hover:underline">
              Browse
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link to={`/browse?category=${listing.categoryId}`} className="rounded hover:text-text hover:underline">
              {categoryName(listing.categoryId)}
            </Link>
          </li>
        </ol>
      </nav>

      <PhotoGallery photos={listing.photos} title={listing.title} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_26rem] lg:gap-14">
        <div className="min-w-0 space-y-10">
          <header>
            {listing.status !== 'active' && (
              <Badge tone="danger" className="mb-3">
                Paused: only you can see this
              </Badge>
            )}
            <h1 className="text-4xl sm:text-5xl">{listing.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted">
              <Rating value={listing.ratingAvg} count={listing.ratingCount} className="text-base text-text" />
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-4" /> {areaName(listing.areaId)}
              </span>
            </p>
          </header>

          <section aria-labelledby="facts-title">
            <h2 id="facts-title" className="sr-only">
              Rental details
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              <Fact icon={<PackageCheck aria-hidden="true" className="size-6" />} title="Condition" body={CONDITION[listing.condition]} />
              <Fact
                icon={<CalendarDays aria-hidden="true" className="size-6" />}
                title="Rental length"
                body={rentalLength(listing)}
              />
              <Fact
                icon={<Truck aria-hidden="true" className="size-6" />}
                title="Getting it"
                body={[
                  listing.pickupOptions.includes('pickup') && `Pick up in ${areaName(listing.areaId)}`,
                  listing.pickupOptions.includes('delivery') && `Delivery ${listing.deliveryFee ? `for ${rupees(listing.deliveryFee)}` : 'free'}`,
                ]
                  .filter(Boolean)
                  .join(', or ')}
              />
              <Fact
                icon={<span aria-hidden="true" className="grid size-6 place-items-center font-display text-lg font-extrabold">₹</span>}
                title="Deposit"
                body={listing.deposit > 0 ? `${rupees(listing.deposit)}, refundable when the item comes back as it left` : 'No deposit needed'}
              />
            </ul>
          </section>

          <section aria-labelledby="about-title">
            <h2 id="about-title" className="text-3xl">
              About this item
            </h2>
            <p className="mt-3 max-w-[65ch] text-lg whitespace-pre-line">{listing.description}</p>
          </section>

          {listing.rules.length > 0 && (
            <section aria-labelledby="rules-title">
              <h2 id="rules-title" className="text-3xl">
                {owner ? `${owner.name.split(' ')[0]}’s` : 'Owner’s'} house rules
              </h2>
              <ul className="mt-3 max-w-[65ch] list-disc space-y-1.5 pl-6 text-lg marker:text-muted">
                {listing.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {owner && <OwnerCard owner={owner} listingId={listing.id} />}

          <Reviews reviews={reviews} authors={authorsById} ratingAvg={listing.ratingAvg} />
        </div>

        <aside id="book" aria-label="Book this item" className="scroll-mt-24">
          <div className="lg:sticky lg:top-24">
            <BookingPanel listing={listing} />
          </div>
        </aside>
      </div>

      {related.length > 0 && <Related listings={related} categoryId={listing.categoryId} />}

      <MobileBookBar listing={listing} />
    </div>
  )
}

function Fact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-muted">{body}</span>
      </span>
    </li>
  )
}

function Related({ listings, categoryId }: { listings: Listing[]; categoryId: string }) {
  return (
    <section aria-labelledby="related-title" className="mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="related-title" className="text-3xl">
          More {categoryName(categoryId).toLowerCase()} nearby
        </h2>
        <ButtonLink to={`/browse?category=${categoryId}`} variant="outline" size="sm">
          See all
        </ButtonLink>
      </div>
      <ul className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((l) => (
          <li key={l.id}>
            <ListingCard listing={l} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Phones: price and a jump to the dates, sitting just above the tab bar. */
function MobileBookBar({ listing }: { listing: Listing }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface px-4 py-3 lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div>
          <PriceTag {...headlinePrice(listing)} size="sm" />
          <p className="mt-1 text-sm text-muted">{listing.deposit > 0 ? `+ ${rupees(listing.deposit)} refundable deposit` : 'No deposit'}</p>
        </div>
        <a href="#book" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover">
          Check dates
        </a>
      </div>
    </div>
  )
}

/** "1 to 30 days", "3 to 12 months", or both. */
function rentalLength(l: Listing): string {
  const span = (min: number, max: number, unit: string) => (min === max ? plural(min, unit) : `${plural(min, unit)} to ${plural(max, unit)}`)
  return [rentsByDay(l) && span(l.minDays, l.maxDays, 'day'), rentsByMonth(l) && span(l.months!.min, l.months!.max, 'month')].filter(Boolean).join(', or ')
}
