import { Link } from 'react-router'
import { AREAS } from '@shared/areas'
import { CATEGORIES } from '@shared/categories'
import { LEGAL } from '@shared/legal'
import { BUSINESS } from '@/config/business'
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
      { to: '/rent-or-buy', label: 'Rent or buy?' },
      { to: '/earn', label: 'What could you earn?' },
      { to: '/contact', label: 'Contact and complaints' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: LEGAL.terms.path, label: 'Terms and Conditions' },
      { to: LEGAL.privacy.path, label: 'Privacy Policy' },
      { to: LEGAL.refunds.path, label: 'Cancellation and refunds' },
      { to: LEGAL.cookies.path, label: 'Cookies and storage' },
    ],
  },
  {
    title: 'Rent',
    links: CATEGORIES.map((c) => ({ to: `/rent/${c.id}`, label: c.name })),
  },
  {
    title: 'Near you',
    links: AREAS.map((a) => ({
      to: `/browse?areas=${a.id}`,
      label: a.name,
    })),
  },
]

export function Footer() {
  return (
    <footer className="dark-scope mt-24 bg-panel pb-24 text-text md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo size="md" variant="dark" />
          <p className="mt-3 text-sm text-muted">Rent anything, anywhere</p>
          <p className="mt-4 max-w-xs text-muted">
            Rent things from people in Bhopal, or earn from the things you don’t use often.
          </p>
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
        © {YEAR} {BUSINESS.legalName ?? 'RentiGoo'}. All prices are in Indian rupees.
      </div>
    </footer>
  )
}
