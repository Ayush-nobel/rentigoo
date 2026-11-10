import { CategoryGrid } from '@/components/home/CategoryGrid'
import { EarningsEstimator } from '@/components/home/EarningsEstimator'
import { FeaturedListings } from '@/components/home/FeaturedListings'
import { Hero } from '@/components/home/Hero'
import { HowItWorksStrip } from '@/components/home/HowItWorksStrip'
import { RentVsBuyCalculator } from '@/components/home/RentVsBuyCalculator'
import { TrustStrip } from '@/components/home/TrustStrip'
import { useAuth } from '@/context/AuthContext'
import { useAsync, useTitle } from '@/hooks/useAsync'
import { api } from '@/lib'

export default function Home() {
  useTitle('')
  const { user } = useAuth()
  const areaId = user?.areaId

  const featured = useAsync(async () => {
    // Prefer listings near the signed-in person; fall back to the whole city.
    if (areaId) {
      const near = await api.searchListings({ areas: [areaId], sort: 'relevance' })
      if (near.items.length >= 4) return { items: near.items.slice(0, 8), areaId }
    }
    const all = await api.searchListings({ sort: 'relevance' })
    return { items: all.items.slice(0, 8), areaId: undefined }
  }, [areaId])

  return (
    <div className="space-y-20 sm:space-y-24">
      <Hero showcase={featured.data?.items ?? []} />
      <CategoryGrid />
      <FeaturedListings listings={featured.data?.items} areaId={featured.data?.areaId} failed={featured.status === 'error'} />
      <HowItWorksStrip />
      <div id="calculators" className="mx-auto grid max-w-7xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-2">
        <RentVsBuyCalculator />
        <EarningsEstimator />
      </div>
      <TrustStrip />
    </div>
  )
}
