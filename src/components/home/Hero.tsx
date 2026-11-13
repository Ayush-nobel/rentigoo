import { headlinePrice } from '@shared/pricing'
import { MapPin, Search } from 'lucide-react'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AREAS, REGIONS } from '@shared/areas'
import type { Listing } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { Button } from '../ui/Button'
import { ListingImage } from '../ui/ListingImage'
import { PriceTag } from '../ui/PriceTag'

const SEARCH_IDEAS = ['Air purifier', 'Projector', 'Camping tent', 'Drill', 'PS5', 'Party speaker']

export function Hero({ showcase, loading }: { showcase: Listing[]; loading: boolean }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [area, setArea] = useState(user?.areaId ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (area) p.set('areas', area)
    navigate(`/browse${p.size ? `?${p}` : ''}`)
  }

  return (
    <section className="relative overflow-x-clip">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-8 text-center sm:px-6 sm:pt-24 lg:pt-32">
        <h1 className="rise mx-auto max-w-[16ch] text-[2.75rem] leading-[1.02] font-bold tracking-[-0.025em] sm:text-6xl lg:text-[5.5rem]">
          Why buy it when someone nearby has one?
        </h1>
        <p className="rise mx-auto mt-6 max-w-xl text-lg text-muted sm:text-xl" style={{ '--delay': '0.12s' } as CSSProperties}>
          Rent cameras, tools, party gear and more from people across Bhopal. Pick it up, use it, give it back when you’re done.
        </p>

        <form
          onSubmit={submit}
          role="search"
          aria-label="Find something to rent"
          className="rise mx-auto mt-10 max-w-2xl text-left"
          style={{ '--delay': '0.24s' } as CSSProperties}
        >
          <div className="flex flex-col gap-2 rounded-[22px] border border-line-strong bg-surface p-2 sm:flex-row sm:items-stretch sm:rounded-full">
            <label className="flex min-h-12 flex-1 items-center gap-2.5 rounded-full px-3 sm:px-4">
              <Search aria-hidden="true" className="size-5 shrink-0 text-muted" />
              <span className="sr-only">What do you need?</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What do you need?"
                className="w-full bg-transparent text-lg outline-none placeholder:text-muted"
              />
            </label>
            <div className="hidden w-px self-stretch bg-line sm:block" aria-hidden="true" />
            <label className="relative flex min-h-12 items-center gap-2 rounded-full px-3 sm:w-56 sm:px-4">
              <MapPin aria-hidden="true" className="size-5 shrink-0 text-muted" />
              <span className="sr-only">Area</span>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full appearance-none bg-transparent text-lg outline-none">
                <option value="">All of Bhopal</option>
                {Object.entries(REGIONS).map(([region, name]) => (
                  <optgroup key={region} label={name}>
                    {AREAS.filter((a) => a.region === region).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <Button type="submit" size="lg" className="sm:px-8">
              Search
            </Button>
          </div>
        </form>

        <div className="rise mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2" style={{ '--delay': '0.36s' } as CSSProperties}>
          <span className="text-[0.9375rem] text-muted">Try</span>
          {SEARCH_IDEAS.map((p) => (
            <Link key={p} to={`/browse?q=${encodeURIComponent(p)}`} className="inline-flex min-h-11 items-center rounded text-[0.9375rem] font-medium underline-offset-4 hover:underline">
              {p}
            </Link>
          ))}
        </div>
      </div>

      {(loading || showcase.length > 0) && <Showcase listings={showcase} />}
    </section>
  )
}

/** Three real listings that grow into place as you scroll: the page's one big moment. */
function Showcase({ listings }: { listings: Listing[] }) {
  // Empty frames hold the space while listings load, so nothing jumps.
  const items: (Listing | null)[] = listings.length ? listings.slice(0, 3) : [null, null, null]
  return (
    <div className="mx-auto hidden max-w-7xl px-6 pt-10 pb-12 md:block" aria-hidden="true">
      <div className="reveal-grow grid origin-top grid-cols-3 gap-4">
        {items.map((l, i) => (
          <div key={l?.id ?? i} className={i === 1 ? '' : 'translate-y-10'}>
            <div className="aspect-[6/7] overflow-hidden rounded-[28px] bg-sunken">{l && <ListingImage photo={l.photos[0]} priority />}</div>
            <div className="flex min-h-11 items-center justify-between gap-2 px-1 pt-3">
              {l && (
                <>
                  <p className="truncate font-semibold">{l.title.split(/ with | for |,/)[0]}</p>
                  <PriceTag {...headlinePrice(l)} size="sm" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
