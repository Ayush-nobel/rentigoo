import { BadgeCheck, HandCoins, MessagesSquare, Star } from 'lucide-react'
import { Link } from 'react-router'

const POINTS = [
  { icon: BadgeCheck, title: 'Verified people', body: 'Email for everyone. Phone and government ID badges show who has gone further.' },
  { icon: HandCoins, title: 'Deposits come back', body: 'Every deposit is shown upfront and returned in full when the item does.' },
  { icon: Star, title: 'Reviews both ways', body: 'Renters review owners and owners review renters, after every rental.' },
  { icon: MessagesSquare, title: 'Help if it goes wrong', body: 'If you can’t agree on damage, our team looks at the photos from both sides.' },
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
