import { EarningsEstimator } from '@/components/calculators/EarningsEstimator'
import { ContentPage } from '@/components/content/Content'
import { Seo } from '@/components/layout/Seo'
import { STATIC_PAGES } from '@/lib/seo'
import { breadcrumbs } from '@/lib/structuredData'

export default function Earn() {
  return (
    <>
      <Seo {...STATIC_PAGES['/earn']!} jsonLd={[breadcrumbs([{ name: 'Home', path: '/' }, { name: 'What could you earn', path: '/earn' }])].filter((x): x is object => x !== null)} />
      <ContentPage title="What could your things earn?" intro={<p>A rough estimate of what renting something out could bring in each month.</p>}>
        <EarningsEstimator />
      </ContentPage>
    </>
  )
}
