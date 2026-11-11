import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Page frame for the plain content pages (How it works, Trust and safety, About). */
export function ContentPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <div className="mt-4 text-xl leading-relaxed text-muted">{intro}</div>
      <div className="mt-12 space-y-14">{children}</div>
    </div>
  )
}

export function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="text-3xl sm:text-4xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-lg leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4">{children}</div>
    </section>
  )
}

/** Numbered steps: only for things that really happen in order. */
export function Steps({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="mt-2 space-y-6">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-on-accent">
            {i + 1}
          </span>
          <div className="pt-1">
            <h3 className="font-sans text-xl font-semibold">{s.title}</h3>
            <div className="mt-1 text-muted">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** A short list with a marker that says what kind of item it is. */
export function Points({ items, tone = 'neutral' }: { items: ReactNode[]; tone?: 'neutral' | 'yes' | 'no' }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden="true"
            className={cx(
              'mt-2.5 size-2.5 shrink-0 rounded-full',
              tone === 'yes' ? 'bg-success' : tone === 'no' ? 'border-2 border-muted' : 'bg-text',
            )}
          />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}
