import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '@/lib/cx'

export const fieldClasses =
  'w-full min-h-12 rounded-field border border-line-strong bg-surface px-3.5 text-base text-text placeholder:text-muted hover:border-text focus-within:border-text focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-solid focus-within:[outline-color:var(--focus)] aria-invalid:border-danger'

interface FieldShellProps {
  label: string
  hint?: ReactNode
  error?: string
  /** Visually hide the label (it still names the field). */
  hideLabel?: boolean
  className?: string
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode
}

/** Label + control + hint + error, wired together for screen readers. */
export function FieldShell({ label, hint, error, hideLabel, className, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className={cx('mb-1.5 block font-semibold', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-[0.9375rem] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-[0.9375rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string
  hint?: ReactNode
  error?: string
  hideLabel?: boolean
  className?: string
  /** Shown inside the field on the left, e.g. ₹. */
  prefix?: string
}

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, hint, error, hideLabel, className, prefix, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy }) => (
        <div className="relative">
          {prefix && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cx(fieldClasses, prefix && 'pl-8')}
            {...rest}
          />
        </div>
      )}
    </FieldShell>
  )
})

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label: string
  hint?: ReactNode
  error?: string
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, hint, error, hideLabel, className, children, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      {({ id, describedBy }) => (
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cx(fieldClasses, 'appearance-none pr-10')}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted" />
        </div>
      )}
    </FieldShell>
  )
})

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  /** How to say the value, e.g. "8 days a month". */
  format: (v: number) => string
  className?: string
}

export function SliderField({ label, value, min, max, step = 1, onChange, format, className }: SliderProps) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-bold">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input w-full"
        style={{ '--fill': `${pct}%` } as React.CSSProperties}
      />
    </div>
  )
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  label: string
  hint?: ReactNode
  error?: string
  className?: string
}

/** Multi-line text, with a character count when there's a maximum. */
export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, hint, error, className, maxLength, value, rows = 5, ...rest },
  ref,
) {
  const count = typeof value === 'string' ? value.length : 0
  const fullHint = maxLength ? (
    <>
      {hint} {hint ? ' ' : ''}
      <span className="whitespace-nowrap">
        {count.toLocaleString('en-IN')} of {maxLength.toLocaleString('en-IN')} characters
      </span>
    </>
  ) : (
    hint
  )
  return (
    <FieldShell label={label} hint={fullHint} error={error} className={className}>
      {({ id, describedBy }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cx(fieldClasses, 'py-3 leading-relaxed')}
          {...rest}
        />
      )}
    </FieldShell>
  )
})
