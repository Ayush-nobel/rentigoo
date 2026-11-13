import { Link } from 'react-router'
import { CATEGORIES } from '@shared/categories'
import { CategoryIcon } from '../ui/CategoryIcon'

/** A quiet row of categories, like a shop's aisle signs: icon over name, no boxes. */
export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="categories-title" className="reveal text-center text-3xl tracking-tight sm:text-5xl">
        What are you looking for?
      </h2>
      <ul className="reveal mt-10 grid grid-cols-3 gap-x-2 gap-y-6 xs:grid-cols-4 sm:grid-cols-5 lg:grid-cols-10">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link to={`/browse?category=${c.id}`} className="group flex h-full flex-col items-center gap-3 rounded-2xl px-1 py-2 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-sunken transition-colors duration-300 group-hover:bg-accent group-hover:text-on-accent sm:size-[4.5rem]">
                <CategoryIcon id={c.id} className="size-7" strokeWidth={1.5} />
              </span>
              <span className="text-[0.9375rem] leading-tight font-medium break-words hyphens-auto">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
