import { getArea } from '@shared/areas'
import { getCategory } from '@shared/categories'
import { parseISODate } from '@shared/pricing'
import { SORT_LABELS, type SearchFilters, type SortKey } from './search'

/**
 * Browse filters live in the URL so searches are shareable and the back
 * button works:
 *   /browse?q=tent&category=outdoor&areas=mp-nagar,kolar-road&min=100&max=500
 *          &from=2026-11-20&to=2026-11-22&deposit=none&delivery=1&sort=price-asc&page=2
 * Anything malformed is dropped rather than trusted.
 */
export function parseBrowseParams(p: URLSearchParams): SearchFilters {
  const f: SearchFilters = {}
  const q = p.get('q')?.trim()
  if (q) f.q = q.slice(0, 100)

  const category = p.get('category')
  if (category && getCategory(category)) f.category = category

  const areas = (p.get('areas') ?? '').split(',').filter((a) => getArea(a))
  if (areas.length) f.areas = [...new Set(areas)]

  const min = wholeRupees(p.get('min'))
  const max = wholeRupees(p.get('max'))
  if (min !== undefined) f.min = min
  if (max !== undefined) f.max = max
  if (f.min !== undefined && f.max !== undefined && f.min > f.max) [f.min, f.max] = [f.max, f.min]

  const from = isoDate(p.get('from'))
  const to = isoDate(p.get('to'))
  if (from && to && from <= to) {
    f.from = from
    f.to = to
  }

  if (p.get('deposit') === 'none') f.noDeposit = true
  if (p.get('delivery') === '1') f.delivery = true

  const sort = p.get('sort')
  if (sort && sort in SORT_LABELS && sort !== 'relevance') f.sort = sort as SortKey

  const page = Number(p.get('page'))
  if (Number.isInteger(page) && page > 1 && page <= 50) f.page = page
  return f
}

export function toBrowseParams(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.areas?.length) p.set('areas', f.areas.join(','))
  if (f.min !== undefined) p.set('min', String(f.min))
  if (f.max !== undefined) p.set('max', String(f.max))
  if (f.from && f.to) {
    p.set('from', f.from)
    p.set('to', f.to)
  }
  if (f.noDeposit) p.set('deposit', 'none')
  if (f.delivery) p.set('delivery', '1')
  if (f.sort && f.sort !== 'relevance') p.set('sort', f.sort)
  if (f.page && f.page > 1) p.set('page', String(f.page))
  return p
}

/** Number of filters applied (search text and sort don't count). */
export function activeFilterCount(f: SearchFilters): number {
  return (
    (f.category ? 1 : 0) +
    (f.areas?.length ?? 0) +
    (f.min !== undefined || f.max !== undefined ? 1 : 0) +
    (f.from ? 1 : 0) +
    (f.noDeposit ? 1 : 0) +
    (f.delivery ? 1 : 0)
  )
}

function wholeRupees(v: string | null): number | undefined {
  if (v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 10_00_000) : undefined
}

function isoDate(v: string | null): string | undefined {
  if (!v) return undefined
  try {
    parseISODate(v)
    return v
  } catch {
    return undefined
  }
}
