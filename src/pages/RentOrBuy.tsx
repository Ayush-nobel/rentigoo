import { RentVsBuyCalculator } from '@/components/calculators/RentVsBuyCalculator'
import { ContentPage } from '@/components/content/Content'
import { Seo } from '@/components/layout/Seo'
import { STATIC_PAGES } from '@/lib/seo'
import { breadcrumbs } from '@/lib/structuredData'

export default function RentOrBuy() {
  return (
    <>
      <Seo {...STATIC_PAGES['/rent-or-buy']!} jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Rent or buy', path: '/rent-or-buy' }])].filter((x): x is object => x !== null)} />
      <ContentPage title="Should you buy this or rent it?" intro={<p>Pick what it is and how often you’d use it.</p>}>
        <RentVsBuyCalculator />
      </ContentPage>
    </>
  )
}
