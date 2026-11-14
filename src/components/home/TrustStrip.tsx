import { Link } from 'react-router'

const POINTS = [
  { title: 'Checked email for everyone', body: 'Every account confirms its email address before it can rent or list anything.' },
  { title: 'Deposits shown upfront', body: 'Every listing shows its deposit before you ask. Our terms require owners to return it when the item comes back as it left.' },
  { title: 'Reviews both ways', body: 'Once an item is returned, the renter can review the owner and the owner can review the renter. Only people who rented can review.' },
  { title: 'Someone to complain to', body: 'If something goes wrong, our grievance officer acknowledges your complaint within 24 hours.' },
]

export function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="trust-title" className="reveal max-w-3xl text-4xl sm:text-6xl">
        Lending to a stranger feels less strange here
      </h2>
      <ul className="reveal mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
        {POINTS.map(({ title, body }) => (
          <li key={title} className="border-t border-line pt-6">
            <h3 className="text-2xl">{title}</h3>
            <p className="mt-2 max-w-md text-lg text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-10">
        <Link to="/trust-and-safety" className="inline-flex min-h-11 items-center rounded font-semibold text-accent-text underline underline-offset-4 hover:no-underline">
          How we keep renting safe
        </Link>
      </p>
    </section>
  )
}
