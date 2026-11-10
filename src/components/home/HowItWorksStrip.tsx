import { Link } from 'react-router'

// A real sequence, so numbered steps are honest here.
const STEPS = [
  {
    title: 'Find it nearby',
    body: 'Search by what you need and where you are. Every listing shows the full price, deposit included, before you ask.',
  },
  {
    title: 'Ask the owner',
    body: 'Pick your dates and send a request. Most owners reply within a few hours, and you can chat before you commit.',
  },
  {
    title: 'Pick up, use, return',
    body: 'Meet, check the item together, pay at pickup. Bring it back on time and your deposit comes straight back.',
  },
]

export function HowItWorksStrip() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="rounded-[28px] border border-line bg-panel px-6 py-10 text-on-panel sm:px-10 sm:py-12">
        <h2 id="how-title" className="text-3xl sm:text-4xl">
          Renting from a neighbour takes three steps
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-display text-xl font-extrabold text-on-accent"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-sans text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 opacity-80">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link to="/how-it-works" className="mt-8 inline-block rounded font-semibold underline underline-offset-4 hover:no-underline">
          How renting and listing work
        </Link>
      </div>
    </section>
  )
}
