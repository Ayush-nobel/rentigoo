import { BadgeCheck, HandCoins, MessagesSquare, Star } from 'lucide-react'
import { Link } from 'react-router'

const POINTS = [
  { icon: BadgeCheck, title: 'Checked email for everyone', body: 'Every account confirms its email address before it can rent or list anything.' },
  { icon: HandCoins, title: 'Deposits shown upfront', body: 'Every listing shows its deposit before you ask. Our terms require owners to return it when the item comes back as it left.' },
  { icon: Star, title: 'Reviews both ways', body: 'Once an item is returned, the renter can review the owner and the owner can review the renter. Only people who rented can review.' },
  { icon: MessagesSquare, title: 'Someone to complain to', body: 'If something goes wrong, our grievance officer acknowledges your complaint within 24 hours.' },
]

export function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="trust-title" className="text-3xl sm:text-4xl">
        Lending to a stranger feels less strange here
      </h2>
      <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <Icon aria-hidden="true" className="size-7" strokeWidth={1.75} />
            <h3 className="mt-3 font-sans text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <Link to="/trust-and-safety" className="mt-8 inline-block rounded font-semibold text-accent-text underline underline-offset-4 hover:no-underline">
        How we keep renting safe
      </Link>
    </section>
  )
}
