import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { STATIC_PAGES } from '@/lib/seo'
import { Seo } from '@/components/layout/Seo'
import { BUSINESS, missingBusinessDetails, shown } from '@/config/business'
import { longDate } from '@/lib/format'

export interface LegalSection {
  id: string
  title: string
  body: ReactNode
}

interface Props {
  /** Route path, for search metadata (must be in STATIC_PAGES). */
  path: string
  title: string
  version: string
  intro: ReactNode
  sections: LegalSection[]
}

/** Shared layout for the legal pages: version, contents list, anchored sections. */
export function LegalPage({ path, title, version, intro, sections }: Props) {
  const missing = missingBusinessDetails()
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <Seo {...(STATIC_PAGES[path] ?? { title, description: '', path })} />
      <header>
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-2 text-muted">Last updated {longDate(version)}</p>
        {missing.length > 0 && (
          <p role="note" className="mt-4 rounded-field border border-danger/40 bg-danger/10 p-3 font-medium">
            Some of our business details are still being added to this page. Until they are, it isn’t complete.
          </p>
        )}
        <div className="mt-6 space-y-3 text-lg">{intro}</div>
      </header>

      <nav aria-label="On this page" className="mt-8 rounded-[20px] border border-line bg-surface p-5">
        <h2 className="font-sans text-base font-semibold">On this page</h2>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-block rounded py-0.5 text-accent-text underline-offset-4 hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-prose mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
            <h2 id={`${s.id}-h`} className="text-2xl sm:text-3xl">
              {i + 1}. {s.title}
            </h2>
            <div className="mt-3 space-y-3">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  )
}

/** The business and grievance contact block, reused across legal pages. */
export function BusinessContact() {
  const g = BUSINESS.grievanceOfficer
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-[20px] border border-line bg-surface p-5 sm:grid-cols-2">
      <Row term="Business" value={`${shown(BUSINESS.legalName, 'Legal name')} (${shown(BUSINESS.entityType, 'type of business')})`} />
      <Row term="Address" value={shown(BUSINESS.address, 'Registered address')} />
      <Row term="Email" value={shown(BUSINESS.supportEmail, 'Support email')} />
      <Row term="Phone" value={shown(BUSINESS.supportPhone, 'Support phone')} />
      <Row term="Grievance officer" value={`${shown(g.name, 'Name')}, ${shown(g.designation, 'designation')}`} />
      <Row term="Grievance officer contact" value={`${shown(g.email, 'Email')}, ${shown(g.phone, 'phone')}`} />
    </dl>
  )
}

function Row({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.9375rem] text-muted">{term}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  )
}

/** Inline link to another legal page or site page. */
export function L({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-semibold text-accent-text underline underline-offset-4 hover:no-underline">
      {children}
    </Link>
  )
}
