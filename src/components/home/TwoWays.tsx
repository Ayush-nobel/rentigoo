import { Link } from 'react-router'
import { CATEGORY_PHOTOS } from '@/data/homePhotos'

const WAYS = [
  {
    term: 'days',
    photo: 'cameras',
    title: 'For a day or a weekend',
    body: 'A camera for a cousin’s wedding, a drill for one wall, a tent for Triund. Pay for the days you use it.',
    link: 'Things to rent by the day',
  },
  {
    term: 'months',
    photo: 'furniture',
    title: 'For a few months',
    body: 'A sofa, a fridge or a study table while you’re in Bhopal for a job or a course. Pay each month, stop with a month’s notice.',
    link: 'Things to rent by the month',
  },
] as const

/** RentiGoo's two kinds of rental, side by side, each led by a big photo. */
export function TwoWays() {
  return (
    <section aria-labelledby="ways-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="ways-title" className="reveal max-w-2xl text-4xl sm:text-6xl">
        Rent it for the weekend, or for the whole term
      </h2>
      <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-6">
        {WAYS.map((w) => (
          <article key={w.term} className="reveal group relative">
            <div className="overflow-hidden rounded-[28px]">
              <img
                src={`/images/home/${w.photo}-wide-800.webp`}
                srcSet={`/images/home/${w.photo}-wide-800.webp 800w, /images/home/${w.photo}-wide-1400.webp 1400w`}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={CATEGORY_PHOTOS[w.photo]!.alt}
                width={1400}
                height={1000}
                loading="lazy"
                className="aspect-[7/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
            <h3 className="mt-6 text-2xl sm:text-3xl">{w.title}</h3>
            <p className="mt-2 max-w-md text-lg text-muted">{w.body}</p>
            <Link
              to={`/browse?term=${w.term}`}
              className="mt-4 inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 after:absolute after:inset-0 hover:no-underline"
            >
              {w.link}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
