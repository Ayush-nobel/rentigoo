import { PackageSearch, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { categoryName } from '@shared/categories'
import { ActiveFilters } from '@/components/browse/ActiveFilters'
import { FilterPanel } from '@/components/browse/FilterPanel'
import { ListingCard, ListingCardSkeleton } from '@/components/listing/ListingCard'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/Feedback'
import { Sheet } from '@/components/ui/Sheet'
import { Seo } from '@/components/layout/Seo'
import { useAsync } from '@/hooks/useAsync'
import { STATIC_PAGES } from '@/lib/seo'
import { api } from '@/lib'
import { activeFilterCount, parseBrowseParams, toBrowseParams } from '@/lib/browseParams'
import { cx } from '@/lib/cx'
import { plural } from '@/lib/format'
import { SORT_LABELS, type SearchFilters, type SearchResult, type SortKey } from '@/lib/search'
import { LAUNCH_CITY } from '@shared/areas'

export default function Browse() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseBrowseParams(params), [params])
  const [sheetOpen, setSheetOpen] = useState(false)
  const filtersButton = useRef<HTMLButtonElement>(null)


  /**
   * Apply a change; anything other than "load more" goes back to page 1. Filters live in the URL so a search can be
   * shared, but each change replaces the history entry: the back button leaves Browse instead of undoing filters.
   */
  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...filters, ...patch }
    if (!('page' in patch)) delete next.page
    setParams(toBrowseParams(next), { replace: true, preventScrollReset: true })
  }
  const clearAll = () => setParams(toBrowseParams({ q: filters.q, sort: filters.sort }), { replace: true, preventScrollReset: true })

  const key = params.toString()
  const result = useAsync(() => api.searchListings(filters), [key])

  // Keep showing the last results while new ones load, so the grid doesn't flash.
  const [shown, setShown] = useState<SearchResult | null>(null)
  if (result.status === 'success' && result.data !== shown) setShown(result.data)
  const loading = result.status === 'loading'

  const count = activeFilterCount(filters)
  const heading = filters.category ? `${categoryName(filters.category)} to rent` : `Things to rent in ${LAUNCH_CITY}`

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 md:pt-10">
      <Seo
        {...STATIC_PAGES['/browse']!}
        title={filters.q ? `“${filters.q}” to rent in ${LAUNCH_CITY}` : filters.category ? `${categoryName(filters.category)} to rent in ${LAUNCH_CITY}` : STATIC_PAGES['/browse']!.title}
        // One canonical per category; other filter combinations point back to it, and searches aren't indexed.
        path={filters.category && !filters.q ? `/browse?category=${filters.category}` : '/browse'}
        noindex={Boolean(filters.q)}
      />
      <h1 className="text-4xl sm:text-5xl">{heading}</h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SearchBox value={filters.q ?? ''} onSearch={(q) => update({ q: q || undefined })} />
        <div className="flex w-full items-center gap-3 sm:w-auto">
        <Button
          ref={filtersButton}
          variant="outline"
          className="shrink-0 lg:hidden"
          icon={<SlidersHorizontal aria-hidden="true" className="size-5" />}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          Filters{count > 0 && <span className="grid size-6 place-items-center rounded-full bg-ink text-sm text-on-ink">{count}</span>}
        </Button>
        <SortSelect value={filters.sort ?? 'relevance'} onChange={(sort) => update({ sort })} />
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <FilterPanel filters={filters} onChange={(p) => update(p)} />
        </aside>

        <section aria-labelledby="results-count" aria-busy={loading}>
          <div className="mb-5 space-y-3">
            <h2 className="font-sans text-base font-semibold">
              {/* Live region inside the heading: a role on the h2 itself would remove its heading role. */}
              <span id="results-count" role="status">
                {shown ? plural(shown.total, 'rental') : 'Finding rentals…'}
              </span>
            </h2>
            <ActiveFilters filters={filters} onChange={(p) => update(p)} onClearAll={clearAll} />
          </div>

          {result.status === 'error' ? (
            <EmptyState title="Listings didn’t load" action={<Button onClick={result.reload}>Try again</Button>}>
              Check your connection and try again.
            </EmptyState>
          ) : !shown ? (
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          ) : shown.total === 0 ? (
            <EmptyState
              icon={<PackageSearch aria-hidden="true" className="size-7" />}
              title={filters.q && count === 0 ? `No “${filters.q}” to rent yet` : 'Nothing matches those filters'}
              action={
                <Button variant="outline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                  Clear search and filters
                </Button>
              }
            >
              {filters.q && count === 0
                ? 'Try a different word, or browse a category.'
                : 'Try fewer filters, other dates or a wider area.'}
            </EmptyState>
          ) : (
            <>
              <ul className={cx('grid gap-x-5 gap-y-8 transition-opacity sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
                {shown.items.map((l, i) => (
                  <li key={l.id}>
                    <ListingCard listing={l} priority={i < 3} />
                  </li>
                ))}
              </ul>
              {shown.hasMore && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <p className="text-muted">
                    Showing {shown.items.length} of {shown.total}
                  </p>
                  {/* A real link, so search engines can reach every listing, not just the first page. */}
                  <Link
                    to={`?${toBrowseParams({ ...filters, page: (filters.page ?? 1) + 1 })}`}
                    replace
                    preventScrollReset
                    aria-disabled={loading || undefined}
                    className={buttonClasses('outline', 'md', loading ? 'pointer-events-none opacity-60' : undefined)}
                  >
                    {loading ? 'Loading…' : 'Show more'}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        returnFocusTo={filtersButton}
        footer={
          <div className="flex items-center gap-3">
            {count > 0 && (
              <Button variant="ghost" onClick={clearAll}>
                Clear all
              </Button>
            )}
            <Button className="flex-1" onClick={() => setSheetOpen(false)}>
              {shown ? `Show ${plural(shown.total, 'rental')}` : 'Show rentals'}
            </Button>
          </div>
        }
      >
        <FilterPanel filters={filters} onChange={(p) => update(p)} />
      </Sheet>
    </div>
  )
}

function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const [last, setLast] = useState(value)
  if (value !== last) {
    setLast(value)
    setDraft(value)
  }

  // Search as you type, after a short pause.
  useEffect(() => {
    if (draft.trim() === value) return
    const t = setTimeout(() => onSearch(draft.trim()), 400)
    return () => clearTimeout(t)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(draft.trim())
  }

  return (
    <form role="search" onSubmit={submit} className="relative min-w-0 flex-1 basis-full sm:basis-80">
      <label htmlFor="browse-q" className="sr-only">
        Search rentals
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        id="browse-q"
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Search tents, speakers, drills…"
        className="min-h-12 w-full rounded-full border border-line-strong bg-surface pr-12 pl-12 text-lg placeholder:text-muted hover:border-text focus-visible:border-text [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            onSearch('')
            inputRef.current?.focus()
          }}
          className="absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-full hover:bg-sunken"
          aria-label="Clear search"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
    </form>
  )
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <span className="text-muted max-sm:sr-only">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-12 w-full min-w-0 rounded-full border border-line-strong bg-surface px-4 font-semibold hover:border-text sm:w-auto"
      >
        {Object.entries(SORT_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
