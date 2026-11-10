import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  label: ReactNode
  /** Smaller text under the label. */
  description?: ReactNode
  error?: string
  className?: string
}

/**
 * The one checkbox style used across RentiGoo (filters, consent, settings).
 * A real <input type="checkbox">, so keyboard (Space) and screen readers work
 * as people expect; the whole row is the click target. Never pre-ticked for consent.
 */
export function Checkbox({ label, description, error, className, ...input }: Props) {
  const id = useId()
  const descId = description ? `${id}-desc` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-sunken">
        <input
          id={id}
          type="checkbox"
          className="check-control mt-0.5"
          aria-describedby={[descId, errId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
          {...input}
        />
        <span className="min-w-0">
          <span className="block">{label}</span>
          {description && (
            <span id={descId} className="mt-0.5 block text-[0.9375rem] text-muted">
              {description}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p id={errId} className="mt-1 pl-11 text-[0.9375rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Radio in the same style, for single choices (e.g. category filter). */
export function Radio({ label, className, ...input }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & { label: ReactNode; className?: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-sunken', className)}>
      <input id={id} type="radio" className="check-control rounded-full" {...input} />
      {label}
    </label>
  )
}
