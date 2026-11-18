import { CategoryGrid } from '@/components/home/CategoryGrid'
import { FeaturedListings } from '@/components/home/FeaturedListings'
import { Hero } from '@/components/home/Hero'
import { FeesDeposits } from '@/components/home/FeesDeposits'
import { FounderBlock } from '@/components/home/FounderBlock'
import { HowItWorksStrip } from '@/components/home/HowItWorksStrip'
import { RentOrBuyExample } from '@/components/home/RentOrBuyExample'
import { TrustStrip } from '@/components/home/TrustStrip'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import type { DeletionSummary, Listing } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { Seo } from '@/components/layout/Seo'
import { useAsync } from '@/hooks/useAsync'
import { STATIC_PAGES } from '@/lib/seo'
import { organization, present, website } from '@/lib/structuredData'
import { api } from '@/lib'
import { useInitialData } from '@/lib/initialData'
import { HOME_DATA_KEY, HOME_LISTINGS } from './homeData'
import { plural } from '@/lib/format'

export default function Home() {
  const { user, status, signOut } = useAuth()
  const areaId = user?.areaId
  const deleted = (useLocation().state as { deleted?: DeletionSummary } | null)?.deleted

  // Arriving here after deleting the account: finish by signing out.
  useEffect(() => {
    if (deleted && status === 'signed-in') void signOut()
  }, [deleted, status, signOut])

  // Built into the page at deploy time, so listings show before any script runs; refreshed in the browser.
  const prerendered = useInitialData<Listing[]>(HOME_DATA_KEY)
  const featured = useAsync(
    async () => {
      // Prefer listings near the signed-in person; fall back to the whole city.
      if (areaId) {
        const near = await api.searchListings({ areas: [areaId], sort: 'relevance' })
        if (near.items.length >= 4) return { items: near.items.slice(0, HOME_LISTINGS), areaId }
      }
      const all = await api.searchListings({ sort: 'relevance' })
      return { items: all.items.slice(0, HOME_LISTINGS), areaId: undefined }
    },
    [areaId],
    { initial: prerendered && { items: prerendered, areaId: undefined } },
  )

  return (
    <div className="space-y-20 pb-12 sm:space-y-28">
      <Seo {...STATIC_PAGES['/']!} jsonLd={present([organization(), website()])} />
      {deleted && (
        <p role="status" className="mx-auto mt-6 max-w-7xl rounded-field bg-sunken px-4 py-3 font-medium sm:px-6">
          Your account is deleted. We removed {plural(deleted.deletedListings, 'listing')} and {plural(deleted.deletedReviews, 'review')}. Thanks for being part of RentiGoo.
        </p>
      )}
      <Hero />
      <FeaturedListings listings={featured.data?.items} areaId={featured.data?.areaId} failed={featured.status === 'error'} />
      <CategoryGrid />
      <RentOrBuyExample listings={featured.data?.items} />
      <HowItWorksStrip />
      <FeesDeposits />
      <TrustStrip />
      <FounderBlock />
    </div>
  )
}
