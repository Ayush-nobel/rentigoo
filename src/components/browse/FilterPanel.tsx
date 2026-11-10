import { useState, type ReactNode } from 'react'
import { AREAS } from '@shared/areas'
import { CATEGORIES } from '@shared/categories'
import { todayIST } from '@/lib/format'
import type { SearchFilters } from '@/lib/search'
import { cx } from '@/lib/cx'
import { Checkbox, Radio } from '../ui/Checkbox'
import { fieldClasses } from '../ui/Field'

interface Props {
  filters: SearchFilters
  onChange: (patch: Partial<SearchFilters>) => void
}


function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line pb-5 last:border-b-0">
      <legend className="mb-2 font-sans text-lg font-semibold">{legend}</legend>
      {children}
    </fieldset>
  )
}

export function FilterPanel({ filters, onChange }: Props) {
  const areas = new Set(filters.areas ?? [])
  const toggleArea = (id: string) => {
    const next = new Set(areas)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ areas: [...next] })
  }

  return (
    <div className="space-y-5">
      <Group legend="Category">
        <div className="grid">
          {[{ id: '', name: 'Everything' }, ...CATEGORIES].map((c) => (
            <Radio
              key={c.id || 'all'}
              name="category"
              label={c.name}
              checked={(filters.category ?? '') === c.id}
              onChange={() => onChange({ category: c.id || undefined })}
            />
          ))}
        </div>
      </Group>

      <Group legend="Area">
        <div className="grid">
          {AREAS.map((a) => (
            <Checkbox key={a.id} label={a.name} checked={areas.has(a.id)} onChange={() => toggleArea(a.id)} />
          ))}
        </div>
      </Group>

      <Group legend="Price per day">
        <PriceRange min={filters.min} max={filters.max} onChange={(min, max) => onChange({ min, max })} />
      </Group>

      <Group legend="Dates">
        <DateRange from={filters.from} to={filters.to} onChange={(from, to) => onChange({ from, to })} />
      </Group>

      <Group legend="Options">
        <Checkbox label="Delivery available" checked={Boolean(filters.delivery)} onChange={(e) => onChange({ delivery: e.target.checked || undefined })} />
        <Checkbox label="No deposit" checked={Boolean(filters.noDeposit)} onChange={(e) => onChange({ noDeposit: e.target.checked || undefined })} />
      </Group>
    </div>
  )
}

/** Min/max in rupees; applies when you leave the field or press Enter. */
function PriceRange({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const [draft, setDraft] = useState({ min: min?.toString() ?? '', max: max?.toString() ?? '' })
  // Follow outside changes (chips removed, filters cleared).
  const key = `${min ?? ''}-${max ?? ''}`
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setDraft({ min: min?.toString() ?? '', max: max?.toString() ?? '' })
  }
  const toNum = (s: string) => (s === '' ? undefined : Number(s))
  const apply = () => onChange(toNum(draft.min), toNum(draft.max))
  const input = (which: 'min' | 'max', label: string) => (
    <label className="flex-1">
      <span className="mb-1 block text-[0.9375rem] text-muted">{label}</span>
      <span className="relative block">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
          ₹
        </span>
        <input
          inputMode="numeric"
          value={draft[which]}
          placeholder={which === 'min' ? '0' : 'Any'}
          onChange={(e) => setDraft((d) => ({ ...d, [which]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className={cx(fieldClasses, 'pl-7')}
        />
      </span>
    </label>
  )
  return (
    <div className="flex items-end gap-3">
      {input('min', 'Lowest')}
      <span aria-hidden="true" className="pb-3 text-muted">
        to
      </span>
      {input('max', 'Highest')}
    </div>
  )
}

/** Pickup and return dates; only applied once both are set and in order. */
function DateRange({ from, to, onChange }: { from?: string; to?: string; onChange: (from?: string, to?: string) => void }) {
  const [draft, setDraft] = useState({ from: from ?? '', to: to ?? '' })
  const today = todayIST()

  // Follow outside changes (chip removed, filters cleared).
  const key = `${from ?? ''}|${to ?? ''}`
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setDraft({ from: from ?? '', to: to ?? '' })
  }

  const update = (next: { from: string; to: string }) => {
    setDraft(next)
    if (next.from && next.to && next.from <= next.to) onChange(next.from, next.to)
    else if (!next.from && !next.to) onChange(undefined, undefined)
  }
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to)

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-[0.9375rem] text-muted">Pickup</span>
          <input
            type="date"
            min={today}
            value={draft.from}
            onChange={(e) => update({ ...draft, from: e.target.value })}
            className={cx(fieldClasses, 'px-2.5')}
            aria-invalid={invalid || undefined}
          />
        </label>
        <label>
          <span className="mb-1 block text-[0.9375rem] text-muted">Return</span>
          <input
            type="date"
            min={draft.from || today}
            value={draft.to}
            onChange={(e) => update({ ...draft, to: e.target.value })}
            className={cx(fieldClasses, 'px-2.5')}
            aria-invalid={invalid || undefined}
          />
        </label>
      </div>
      <p className={cx('mt-2 text-[0.9375rem]', invalid ? 'font-medium text-danger' : 'text-muted')} role={invalid ? 'alert' : undefined}>
        {invalid ? 'Return date needs to be on or after pickup.' : 'We’ll hide anything already booked on those days.'}
      </p>
      {(draft.from || draft.to) && (
        <button type="button" onClick={() => update({ from: '', to: '' })} className="mt-1 min-h-11 rounded font-semibold underline underline-offset-4">
          Clear dates
        </button>
      )}
    </div>
  )
}
