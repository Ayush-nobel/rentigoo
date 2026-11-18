import { Link } from 'react-router'
import { CATEGORIES } from '@shared/categories'
import { CategoryIcon } from '../ui/CategoryIcon'

/** Every category as a plain link: two columns on phones, five on wide screens. */
export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="categories-title" className="reveal text-3xl sm:text-5xl">
        Things people rent
      </h2>
      <ul className="reveal mt-8 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link to={`/browse?category=${c.id}`} className="flex min-h-14 items-center gap-3 rounded-xl py-2 pr-2 hover:bg-sunken">
              <CategoryIcon id={c.id} className="size-6 shrink-0" />
              <span className="leading-tight font-semibold">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
