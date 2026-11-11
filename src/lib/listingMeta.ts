import { areaName, LAUNCH_CITY } from '@shared/areas'
import { categoryName } from '@shared/categories'
import { headlinePrice, rentsByMonth } from '@shared/pricing'
import type { Listing } from '@shared/types'
import { rupees } from './format'
import type { PageMeta } from './seo'
import { breadcrumbs, present } from './structuredData'

/** Search and preview metadata for a listing, shared by the page and the prerender. */
export function listingMeta(l: Listing): PageMeta {
  const where = `${areaName(l.areaId)}, ${LAUNCH_CITY}`
  const price = headlinePrice(l)
  const lead =
    price.per === 'day'
      ? `Rent for ${rupees(price.amount)} a day${rentsByMonth(l) ? ` or ${rupees(l.pricing.monthly!)} a month` : ''} in ${where}.`
      : `Rent for ${rupees(price.amount)} a month in ${where}.`
  const body = l.description.replace(/\s+/g, ' ').trim()
  const room = 158 - lead.length - 1
  const snippet = body.length > room ? `${body.slice(0, room - 1).replace(/\s+\S*$/, '')}…` : body
  return {
    title: `${l.title} for rent in ${areaName(l.areaId)}`,
    description: `${lead} ${snippet}`,
    path: `/listing/${l.id}`,
    noindex: l.status !== 'active',
    jsonLd: present([
      breadcrumbs([
        { name: 'Browse', path: '/browse' },
        { name: categoryName(l.categoryId), path: `/browse?category=${l.categoryId}` },
        { name: l.title, path: `/listing/${l.id}` },
      ]),
    ]),
  }
}
