import { motion } from 'framer-motion'
import { MapPin, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AREAS, REGIONS } from '@shared/areas'
import type { Listing } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { Button } from '../ui/Button'
import { ListingImage } from '../ui/ListingImage'
import { PriceTag } from '../ui/PriceTag'

const POPULAR = ['Air purifier', 'Projector', 'Camping tent', 'Drill', 'PS5', 'Party speaker']

export function Hero({ showcase }: { showcase: Listing[] }) {
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
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-10 pb-4 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-10">
        <div>
          <h1 className="max-w-[13ch] text-[2.75rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Why buy it when someone nearby has one?
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
            Rent cameras, tools, party gear and more from people across Bhopal. Pick it up today, give it back when you’re done.
          </p>

          <form onSubmit={submit} role="search" aria-label="Find something to rent" className="mt-8 max-w-2xl">
            <div className="flex flex-col gap-2 rounded-[22px] border border-line-strong bg-surface p-2 shadow-card sm:flex-row sm:items-stretch sm:rounded-full">
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
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full appearance-none bg-transparent text-lg outline-none"
                >
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

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[0.9375rem] text-muted">Popular this week:</span>
            {POPULAR.map((p) => (
              <Link
                key={p}
                to={`/browse?q=${encodeURIComponent(p)}`}
                className="rounded-full border border-line px-3 py-1.5 text-[0.9375rem] hover:border-text"
              >
                {p}
              </Link>
            ))}
          </div>
        </div>

        <TagRack listings={showcase} />
      </div>
    </section>
  )
}

/** Three real listings hanging like rental tags: the page's one orchestrated moment. */
function TagRack({ listings }: { listings: Listing[] }) {
  const items = listings.slice(0, 3)
  const placements = [
    { className: 'left-0 top-4 w-[50%] z-10', rotate: -5 },
    { className: 'right-0 top-0 w-[48%] z-20', rotate: 4 },
    { className: 'left-[14%] -bottom-6 w-[50%] z-30', rotate: -1.5 },
  ]
  return (
    <div className="relative mx-auto hidden aspect-[1/0.95] w-full max-w-lg lg:block" aria-hidden="true">
      {items.map((l, i) => (
        <motion.div
          key={l.id}
          className={`absolute ${placements[i]!.className}`}
          initial={{ opacity: 0, y: -24, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: placements[i]!.rotate }}
          transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 140, damping: 14 }}
          style={{ transformOrigin: '50% 0%' }}
        >
          <div className="rounded-[24px] border border-line bg-surface p-2.5 shadow-card">
            <div className="aspect-[4/3] overflow-hidden rounded-photo">
              <ListingImage photo={l.photos[0]} priority />
            </div>
            <div className="flex items-center justify-between gap-2 px-1.5 pt-2.5 pb-1">
              <p className="truncate font-semibold">{l.title.split(/ with | for |,/)[0]}</p>
              <PriceTag amount={l.pricing.daily} size="sm" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
