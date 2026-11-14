import { Link } from 'react-router'
import { CATEGORIES } from '@shared/categories'

/** Categories as photos: a scrolling row on phones, two rows of five on wide screens. */
export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-7xl sm:px-6">
      <div className="reveal flex flex-wrap items-end justify-between gap-4 px-4 sm:px-0">
        <h2 id="categories-title" className="text-4xl sm:text-6xl">
          Things people rent
        </h2>
        <Link to="/browse" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
          Browse everything
        </Link>
      </div>
      <ul className="reveal mt-10 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:grid sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="w-[44%] shrink-0 snap-start sm:w-auto">
            <Link to={`/browse?category=${c.id}`} className="group block rounded-[22px]">
              <span className="block overflow-hidden rounded-[22px] bg-sunken">
                <img
                  src={`/images/home/${c.id}-480.webp`}
                  srcSet={`/images/home/${c.id}-480.webp 480w, /images/home/${c.id}-800.webp 800w`}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 44vw"
                  alt=""
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </span>
              <span className="mt-3 block text-lg leading-tight font-semibold">{c.name}</span>
              <span className="mt-1 block text-[0.9375rem] leading-snug text-muted">{c.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
