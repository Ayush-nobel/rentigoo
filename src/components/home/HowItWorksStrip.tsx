import { Link } from 'react-router'

// A real sequence, so numbered steps are honest here.
const STEPS = [
  { title: 'Find it', body: 'Search by item and area. Every listing shows the price and deposit.' },
  { title: 'Send a request', body: 'Pick your dates. You pay nothing until the owner accepts.' },
  { title: 'Pick up and return', body: 'Pay the owner at pickup. Get your deposit back when you return it.' },
]

/** The three steps in one row: a plain strip, not a set of cards. */
export function HowItWorksStrip() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <h2 id="how-title" className="text-3xl sm:text-5xl">
        How it works
      </h2>
      <ol className="mt-8 grid gap-6 border-y-2 border-ink py-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        {STEPS.map((s, i) => (
          <li key={s.title} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <p className="text-xl font-semibold">
              <span className="mr-2 inline-grid size-8 place-items-center rounded-full bg-accent text-base text-on-accent">{i + 1}</span>
              {s.title}
            </p>
            <p className="mt-2 text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <Link to="/how-it-works" className="mt-5 inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
        More about how it works
      </Link>
    </section>
  )
}
