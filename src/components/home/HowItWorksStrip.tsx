import { Link } from 'react-router'

// A real sequence, so numbered steps are honest here.
const STEPS = [
  {
    title: 'Find it',
    body: 'Search by item and area. Every listing shows the price and deposit.',
  },
  {
    title: 'Send a request',
    body: 'Pick your dates. You pay nothing until the owner accepts.',
  },
  {
    title: 'Pick up and return',
    body: 'Pay the owner at pickup. Get your deposit back when you return it.',
  },
]

/** Full-width dark band: the heading stays put while each step lights up as you scroll past it. */
export function HowItWorksStrip() {
  return (
    <section aria-labelledby="how-title" className="bg-panel text-on-panel">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 id="how-title" className="text-4xl tracking-tight sm:text-6xl">
            How it works
          </h2>
          <Link to="/how-it-works" className="mt-8 inline-flex min-h-11 items-center rounded font-semibold text-accent underline underline-offset-4 hover:no-underline">
            More about how it works
          </Link>
        </div>
        <ol className="space-y-14 sm:space-y-20">
          {STEPS.map((s, i) => (
            <li key={s.title} className="spotlight border-t border-white/20 pt-6">
              <h3 className="text-3xl sm:text-4xl">
                <span className="text-accent">{i + 1}.</span> {s.title}
              </h3>
              <p className="mt-3 max-w-md text-lg text-white/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
