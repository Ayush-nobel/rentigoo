import { isRangeAvailable } from '@shared/pricing'
import type { ISODate, Listing } from '@shared/types'

export type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'newest'

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Best match',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  rating: 'Top rated',
  newest: 'Newest',
}

export interface SearchFilters {
  q?: string
  category?: string
  areas?: string[]
  /** Daily price range in rupees. */
  min?: number
  max?: number
  from?: ISODate
  to?: ISODate
  /** Only listings with no deposit. */
  noDeposit?: boolean
  /** Only listings that offer delivery. */
  delivery?: boolean
  sort?: SortKey
  page?: number
}

export const PAGE_SIZE = 12

export interface SearchResult {
  items: Listing[]
  total: number
  page: number
  hasMore: boolean
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

function textScore(l: Listing, terms: string[], categoryName: (id: string) => string): number {
  if (!terms.length) return 0
  const title = norm(l.title)
  const rest = norm(`${l.description} ${categoryName(l.categoryId)}`)
  let score = 0
  for (const t of terms) {
    if (title.includes(t)) score += 3
    else if (rest.includes(t)) score += 1
    else return -1 // every term must match somewhere
  }
  return score
}

/** Filter, sort and paginate. Pure, so the mock API and tests share it. */
export function searchListings(
  all: Listing[],
  f: SearchFilters,
  categoryName: (id: string) => string = () => '',
): SearchResult {
  const terms = f.q ? norm(f.q).split(/\s+/).filter(Boolean) : []
  const areas = f.areas?.length ? new Set(f.areas) : null
  const hasDates = Boolean(f.from && f.to && f.from <= f.to)

  const scored: { l: Listing; score: number }[] = []
  for (const l of all) {
    if (l.status !== 'active') continue
    if (f.category && l.categoryId !== f.category) continue
    if (areas && !areas.has(l.areaId)) continue
    if (f.min !== undefined && l.pricing.daily < f.min) continue
    if (f.max !== undefined && l.pricing.daily > f.max) continue
    if (f.noDeposit && l.deposit > 0) continue
    if (f.delivery && !l.pickupOptions.includes('delivery')) continue
    if (hasDates && !isRangeAvailable(f.from!, f.to!, l.blockedDates)) continue
    const score = textScore(l, terms, categoryName)
    if (score < 0) continue
    scored.push({ l, score })
  }

  const sort = f.sort ?? 'relevance'
  const quality = (l: Listing) => l.ratingAvg * Math.log2(2 + l.ratingCount)
  scored.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return a.l.pricing.daily - b.l.pricing.daily
      case 'price-desc':
        return b.l.pricing.daily - a.l.pricing.daily
      case 'rating':
        return b.l.ratingAvg - a.l.ratingAvg || b.l.ratingCount - a.l.ratingCount
      case 'newest':
        return b.l.createdAt.localeCompare(a.l.createdAt)
      default:
        return b.score - a.score || quality(b.l) - quality(a.l)
    }
  })

  const page = Math.max(1, f.page ?? 1)
  // "Load more" returns everything up to and including this page.
  const items = scored.slice(0, page * PAGE_SIZE).map((s) => s.l)
  return { items, total: scored.length, page, hasMore: scored.length > items.length }
}
