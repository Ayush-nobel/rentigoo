import { Link, useParams } from 'react-router'
import { getCategory } from '@shared/categories'
import type { Listing } from '@shared/types'
import { HowPayingWorks } from '@/components/content/HowPayingWorks'
import { RequestForm } from '@/components/home/RequestForm'
import { Seo } from '@/components/layout/Seo'
import { ListingCard, ListingCardSkeleton } from '@/components/listing/ListingCard'
import { ButtonLink } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/lib'
import { CATEGORY_PAGES, categoryDataKey, categoryPageMeta, categoryPagePath } from '@/lib/categoryPages'
import { useInitialData } from '@/lib/initialData'
import { breadcrumbs } from '@/lib/structuredData'
import NotFound from './NotFound'

/** "Camera on rent in Bhopal": one page per category, built with its listings so search engines see them. */
export default function CategoryPage() {
  const { categoryId = '' } = useParams()
  const category = getCategory(categoryId)
  const page = CATEGORY_PAGES[categoryId]
  const prerendered = useInitialData<Listing[]>(categoryDataKey(categoryId))
  const listings = useAsync(async () => (await api.searchListings({ category: categoryId, sort: 'relevance' })).items, [categoryId], { initial: prerendered })

  if (!category || !page) return <NotFound />
  const path = categoryPagePath(category.id)
  const items = listings.data

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-12 sm:px-6 md:pt-12">
      <Seo
        {...categoryPageMeta(category.id)}
        jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: page.heading, path }])].filter((x): x is object => x !== null)}
      />
      <h1 className="text-4xl sm:text-6xl">{page.heading}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">{page.intro}</p>

      <div className="mt-10">
        {listings.status === 'error' ? (
          <p className="text-muted">Listings didn’t load. Refresh the page to try again.</p>
        ) : !items ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <RequestForm defaultWhat={category.name} intro={`Nothing in ${category.name.toLowerCase()} is listed yet. Tell us what you need on WhatsApp and we’ll try to find someone nearby who has it.`} />
        ) : (
          <>
            <h2 className="sr-only">{items.length} to rent</h2>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 12).map((l, i) => (
                <ListingCard key={l.id} listing={l} priority={i < 3} tag="lg" />
              ))}
            </div>
            <ButtonLink to={`/browse?category=${category.id}`} variant="outline" className="mt-8">
              Filter by area, dates and price
            </ButtonLink>
          </>
        )}
      </div>

      <HowPayingWorks className="mt-20" />
      <p className="mt-8 text-muted">
        Own one yourself?{' '}
        <Link to="/list" className="font-semibold text-text underline underline-offset-4">
          List it for free
        </Link>{' '}
        and earn from it when you’re not using it.
      </p>
    </div>
  )
}
