import { useId } from 'react'
import type { RentalTerm } from '@shared/types'

/** "By the day | By the month": two radio buttons styled as one switch. */
export function TermSwitch({ value, onChange, legend, className }: { value: RentalTerm; onChange: (t: RentalTerm) => void; legend: string; className?: string }) {
  const name = useId()
  return (
    <fieldset className={className}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
        {(
          [
            ['days', 'By the day'],
            ['months', 'By the month'],
          ] as const
        ).map(([t, label]) => (
          <label
            key={t}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-full font-semibold text-text has-checked:bg-surface has-checked:shadow-card has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-solid has-focus-visible:[outline-color:var(--focus)]"
          >
            <input type="radio" name={name} className="sr-only" checked={value === t} onChange={() => onChange(t)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
