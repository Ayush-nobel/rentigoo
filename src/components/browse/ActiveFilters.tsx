import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { areaName } from '@shared/areas'
import { categoryName } from '@shared/categories'
import { dateRange, rupees } from '@/lib/format'
import type { SearchFilters } from '@/lib/search'

interface Props {
  filters: SearchFilters
  onChange: (patch: Partial<SearchFilters>) => void
  onClearAll: () => void
}

/** Removable chips for each applied filter. */
export function ActiveFilters({ filters: f, onChange, onClearAll }: Props) {
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, remove: () => onChange({ q: undefined }) })
  if (f.category) chips.push({ key: 'cat', label: categoryName(f.category), remove: () => onChange({ category: undefined }) })
  for (const a of f.areas ?? []) {
    chips.push({ key: `a-${a}`, label: areaName(a), remove: () => onChange({ areas: f.areas!.filter((x) => x !== a) }) })
  }
  if (f.min !== undefined || f.max !== undefined) {
    const label =
      f.min !== undefined && f.max !== undefined
        ? `${rupees(f.min)}–${rupees(f.max)} a day`
        : f.min !== undefined
          ? `From ${rupees(f.min)} a day`
          : `Up to ${rupees(f.max!)} a day`
    chips.push({ key: 'price', label, remove: () => onChange({ min: undefined, max: undefined }) })
  }
  if (f.from && f.to) chips.push({ key: 'dates', label: `Free ${dateRange(f.from, f.to)}`, remove: () => onChange({ from: undefined, to: undefined }) })
  if (f.delivery) chips.push({ key: 'del', label: 'Delivery', remove: () => onChange({ delivery: undefined }) })
  if (f.noDeposit) chips.push({ key: 'dep', label: 'No deposit', remove: () => onChange({ noDeposit: undefined }) })

  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Applied filters:</span>
      <AnimatePresence initial={false} mode="popLayout">
      {chips.map((c) => (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.16 }}
          key={c.key}
          type="button"
          onClick={c.remove}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink py-1.5 pr-2.5 pl-3.5 text-[0.9375rem] font-medium text-on-ink hover:opacity-90"
        >
          {c.label}
          <X aria-hidden="true" className="size-4" />
          <span className="sr-only">(remove)</span>
        </motion.button>
      ))}
      </AnimatePresence>
      {chips.length > 1 && (
        <button type="button" onClick={onClearAll} className="min-h-10 rounded px-2 font-semibold underline underline-offset-4">
          Clear all
        </button>
      )}
    </div>
  )
}
