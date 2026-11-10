import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FaqItem } from '@shared/types'
import { Seo } from '@/components/layout/Seo'
import { L } from '@/components/legal/LegalPage'
import { FAQS, FAQ_SECTIONS } from '@/data/faqs'
import { STATIC_PAGES } from '@/lib/seo'
import { faqPage } from '@/lib/structuredData'

const norm = (s: string) => s.toLowerCase()

export default function FAQ() {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean)
    return terms.length ? FAQS.filter((f) => terms.every((t) => norm(`${f.q} ${f.a}`).includes(t))) : FAQS
  }, [q])
  const sections = Object.entries(FAQ_SECTIONS)
    .map(([id, title]) => ({ id, title, items: shown.filter((f) => f.section === id) }))
    .filter((s) => s.items.length)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <Seo {...STATIC_PAGES['/faq']!} jsonLd={[faqPage(FAQS)]} />
      <h1 className="text-4xl sm:text-5xl">Questions and answers</h1>
      <p className="mt-3 text-lg text-muted">How renting and lending work on RentiGoo. Can’t find your answer? Contact us from the Contact page.</p>

      <div className="relative mt-8">
        <label htmlFor="faq-search" className="sr-only">
          Search questions
        </label>
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
        <input
          id="faq-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search, e.g. deposit"
          className="min-h-12 w-full rounded-full border border-line-strong bg-surface pr-4 pl-12 text-lg placeholder:text-muted hover:border-text focus-within:outline-2 focus-within:outline-solid focus-within:[outline-color:var(--focus)]"
        />
      </div>
      <p role="status" className="mt-3 text-[0.9375rem] text-muted">
        {q ? `${shown.length} ${shown.length === 1 ? 'answer' : 'answers'} found` : ''}
      </p>

      {sections.length === 0 ? (
        <p className="mt-6">
          No answers match that. Try another word, or <L to="/contact">contact us</L>.
        </p>
      ) : (
        <div className="mt-4 space-y-10">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`faq-${s.id}`}>
              <h2 id={`faq-${s.id}`} className="text-2xl sm:text-3xl">
                {s.title}
              </h2>
              <div className="mt-3 divide-y divide-line rounded-[20px] border border-line bg-surface">
                {s.items.map((f) => (
                  <Question key={f.id} item={f} open={Boolean(q)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function Question({ item, open }: { item: FaqItem; open: boolean }) {
  return (
    <details className="smooth group px-5 py-1" open={open || undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold [&::-webkit-details-marker]:hidden">
        <h3 className="font-sans text-lg font-semibold">{item.q}</h3>
        <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="pb-4 text-muted">{item.a}</p>
    </details>
  )
}
