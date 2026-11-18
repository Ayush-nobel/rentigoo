import { Link } from 'react-router'
import { BUSINESS, whatsappUrl } from '@/config/business'

const wa = whatsappUrl()

const POINTS = [
  { title: 'Photos at pickup and return', body: 'Owner and renter record the item’s condition on the booking, together. If there’s a dispute, that’s what we look at.' },
  { title: 'Deposit shown upfront', body: 'You see it before you ask. Our terms say it comes back when the item does.' },
  { title: 'Reviews from both sides', body: 'Renters and owners review each other. Only people who rented can review.' },
]

export function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="trust-title" className="reveal max-w-3xl text-3xl sm:text-5xl">
        Safety
      </h2>
      <ul className="reveal mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {POINTS.map(({ title, body }) => (
          <li key={title} className="border-t border-line pt-5">
            <h3 className="text-xl">{title}</h3>
            <p className="mt-1 max-w-md text-muted">{body}</p>
          </li>
        ))}
        <li className="border-t border-line pt-5">
          <h3 className="text-xl">Help if something goes wrong</h3>
          <p className="mt-1 max-w-md text-muted">
            {wa && (
              <>
                <a href={wa} className="font-semibold text-text underline underline-offset-4" rel="noopener noreferrer">
                  WhatsApp
                </a>{' '}
                or{' '}
              </>
            )}
            call us on{' '}
            <a href={`tel:${BUSINESS.supportPhone?.replace(/\s/g, '')}`} className="font-semibold whitespace-nowrap text-text underline underline-offset-4">
              {BUSINESS.supportPhone}
            </a>
            . We reply to complaints within 24 hours.
          </p>
        </li>
      </ul>
      <p className="mt-10">
        <Link to="/trust-and-safety" className="inline-flex min-h-11 items-center rounded font-semibold text-accent-text underline underline-offset-4 hover:no-underline">
          More on safety
        </Link>
      </p>
    </section>
  )
}
