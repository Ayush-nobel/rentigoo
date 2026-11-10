import { Check, Eye, EyeOff, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { passwordChecks } from '@shared/accountRules'
import { cx } from '@/lib/cx'
import { fieldClasses } from '../ui/Field'

interface PasswordProps {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  /** Show the live rules checklist (sign-up and reset). */
  showRules?: boolean
}

export function PasswordField({ label, value, onChange, autoComplete, error, showRules }: PasswordProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const rulesId = `${id}-rules`
  const errorId = `${id}-error`
  const checks = passwordChecks(value)
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={[showRules && rulesId, error && errorId].filter(Boolean).join(' ') || undefined}
          className={cx(fieldClasses, 'pr-12')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full hover:bg-sunken"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {showRules && (
        <ul id={rulesId} className="mt-2 grid gap-1 text-[0.9375rem] sm:grid-cols-2" aria-label="Password needs">
          {checks.map((c) => (
            <li key={c.id} className={cx('flex items-center gap-1.5', c.ok ? 'text-success' : 'text-muted')}>
              {c.ok ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
              {c.label}
              <span className="sr-only">{c.ok ? ': done' : ': not yet'}</span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-[0.9375rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function CodeField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        6-digit code
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(fieldClasses, 'max-w-48 font-display text-2xl tracking-[0.3em]')}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.9375rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** Shared page frame for log in / sign up. */
export function AuthFrame({ title, intro, children, aside }: { title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-10 sm:px-6 md:py-16 lg:grid-cols-[1fr_22rem]">
      <section className="max-w-lg">
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        {intro && <div className="mt-3 text-lg text-muted">{intro}</div>}
        <div className="mt-8">{children}</div>
      </section>
      {aside && <aside className="hidden self-start rounded-[28px] bg-panel p-8 text-on-panel lg:block">{aside}</aside>}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-field border border-danger/40 bg-danger/10 p-3 font-medium text-danger">
      {children}
    </p>
  )
}
