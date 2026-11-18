import { MapPin, Search } from 'lucide-react'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AREAS, REGIONS } from '@shared/areas'
import { useAuth } from '@/context/AuthContext'
import { Button } from '../ui/Button'

const SEARCH_IDEAS = ['Camping tent', 'Projector', 'Drill', 'PS5', 'Sofa', 'Party speaker']
const delay = (s: number) => ({ '--delay': `${s}s` }) as CSSProperties

export function Hero() {
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
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16 lg:pt-20">
      <div>
        <h1 className="rise max-w-[16ch] text-[2.9rem] leading-[0.98] sm:text-7xl lg:text-[5.25rem]">Why buy it when someone nearby has one?</h1>
        <p className="rise mt-6 max-w-lg text-lg text-muted sm:text-xl" style={delay(0.1)}>
          Rent a tent for the weekend, a drill for one wall, a sofa for the term. From people across Bhopal, at a price you see upfront.
        </p>

        <form onSubmit={submit} role="search" aria-label="Find something to rent" className="rise mt-9 max-w-xl" style={delay(0.2)}>
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
            <label className="relative flex min-h-12 items-center gap-2 rounded-full px-3 sm:w-48 sm:px-4">
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

        <p className="rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem]" style={delay(0.3)}>
          <span className="text-muted">People look for</span>
          {SEARCH_IDEAS.map((p) => (
            <Link key={p} to={`/browse?q=${encodeURIComponent(p)}`} className="inline-flex min-h-11 items-center rounded font-medium underline decoration-line-strong underline-offset-4 hover:decoration-text">
              {p}
            </Link>
          ))}
        </p>
      </div>
    </section>
  )
}
