import { ChevronDown, MapPin, Search } from 'lucide-react'
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AREAS, REGIONS } from '@shared/areas'
import { whatsappUrl } from '@/config/business'
import { useAuth } from '@/context/AuthContext'
import { Button } from '../ui/Button'

const SEARCH_IDEAS = ['Camping tent', 'Projector', 'Drill', 'PS5', 'Sofa', 'Party speaker']
const WHATSAPP = whatsappUrl()
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
    <section className="light-scope bg-accent text-on-accent">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
        <h1 className="rise max-w-[16ch] text-[2.9rem] leading-[0.98] sm:text-7xl lg:text-[5.25rem]">Why buy it when someone nearby has one?</h1>
        <p className="rise mt-6 max-w-lg text-lg sm:text-xl" style={delay(0.1)}>
          Rent from people in Bhopal, by the day or by the month.
        </p>

        <form onSubmit={submit} role="search" aria-label="Find something to rent" className="rise mt-9 max-w-xl" style={delay(0.2)}>
          <div className="flex flex-col gap-2 rounded-[22px] border-2 border-ink bg-surface p-2 sm:flex-row sm:items-stretch sm:rounded-full">
            <label className="flex min-h-12 flex-1 items-center gap-2.5 rounded-full px-3 sm:px-4">
              <Search aria-hidden="true" className="size-5 shrink-0" />
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
              <MapPin aria-hidden="true" className="size-5 shrink-0" />
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
              <ChevronDown aria-hidden="true" className="pointer-events-none size-5 shrink-0" />
            </label>
            <Button type="submit" size="lg" variant="ink" className="sm:px-8">
              Search
            </Button>
          </div>
        </form>

        <p className="rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.9375rem]" style={delay(0.3)}>
          <span>Try</span>
          {SEARCH_IDEAS.map((p) => (
            <Link key={p} to={`/browse?q=${encodeURIComponent(p)}`} className="inline-flex min-h-11 items-center rounded font-medium underline decoration-ink/50 underline-offset-4 hover:decoration-ink">
              {p}
            </Link>
          ))}
        </p>
        {WHATSAPP && (
          <p className="rise mt-4 text-lg" style={delay(0.35)}>
            Need something?{' '}
            <a href={WHATSAPP} rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4">
              WhatsApp us
            </a>{' '}
            and we’ll find it nearby.
          </p>
        )}
      </div>
    </section>
  )
}
