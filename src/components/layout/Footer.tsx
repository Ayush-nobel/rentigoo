import { Link } from 'react-router'
import { AREAS } from '@shared/areas'
import { CATEGORIES } from '@shared/categories'
import { Logo } from './Logo'

const YEAR = new Date().getFullYear()

const groups = [
  {
    title: 'RentiGoo',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/trust-and-safety', label: 'Trust and safety' },
      { to: '/faq', label: 'Questions and answers' },
    ],
  },
  {
    title: 'Rent',
    links: CATEGORIES.slice(0, 6).map((c) => ({ to: `/browse?category=${c.id}`, label: c.name })),
  },
  {
    title: 'Near you',
    links: AREAS.filter((a) => ['south-delhi', 'dwarka', 'noida', 'gurugram', 'ghaziabad', 'faridabad'].includes(a.id)).map((a) => ({
      to: `/browse?areas=${a.id}`,
      label: a.name,
    })),
  },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sunken pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-muted">
            Rent the things you need from people nearby. Earn from the things you don’t use every day.
          </p>
          <p className="mt-6 text-muted">Made in Delhi, for Delhi NCR.</p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="font-sans text-base font-semibold">{g.title}</h2>
            <ul className="mt-3 space-y-1">
              {g.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="inline-block rounded py-1 text-muted hover:text-text hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-line px-4 py-6 text-sm text-muted sm:px-6">
        © {YEAR} RentiGoo. Prices in Indian rupees, including GST where it applies.
      </div>
    </footer>
  )
}
