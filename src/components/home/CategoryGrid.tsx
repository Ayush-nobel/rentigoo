import { Link } from 'react-router'
import { CATEGORIES } from '@shared/categories'
import { CATEGORY_TONES } from '@/lib/categoryMeta'
import { CategoryIcon } from '../ui/CategoryIcon'

export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="categories-title" className="text-3xl sm:text-4xl">
        What are you looking for?
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              to={`/browse?category=${c.id}`}
              className="flex h-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-line-strong sm:p-4"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl sm:size-12"
                style={{ background: `color-mix(in oklab, ${CATEGORY_TONES[c.id]} 40%, var(--surface))` }}
              >
                <CategoryIcon id={c.id} className="size-5 sm:size-6" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 break-words hyphens-auto">
                <span className="block leading-tight font-semibold">{c.name}</span>
                <span className="mt-0.5 hidden text-sm leading-snug text-muted sm:block">{c.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
