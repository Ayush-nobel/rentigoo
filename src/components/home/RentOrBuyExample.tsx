import { Link } from 'react-router'
import { rentVsBuy } from '@shared/calculators'
import { getCategory } from '@shared/categories'
import { rupees } from '@/lib/format'

const WEEKEND_DAYS = 3

/** One worked example from the same estimates the calculators use, and a link to each calculator. */
export function RentOrBuyExample() {
  const camera = getCategory('cameras')!
  const rent = rentVsBuy({ purchasePrice: camera.avgPurchasePrice, resalePct: 0, upkeepPerYear: 0, years: 1, dailyRate: camera.avgDailyRate, daysPerYear: WEEKEND_DAYS }).rentCost
  return (
    <section aria-label="Renting or buying" className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="reveal max-w-3xl font-display text-2xl leading-snug font-semibold sm:text-4xl">
        Renting a DSLR for a wedding weekend: about {rupees(rent)}, instead of about {rupees(camera.avgPurchasePrice)} to buy one.
      </p>
      <p className="mt-3 text-muted">Our estimate, for {WEEKEND_DAYS} days at a typical Bhopal price.</p>
      <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
        <li>
          <Link to="/rent-or-buy" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
            Work out rent or buy for anything
          </Link>
        </li>
        <li>
          <Link to="/earn" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
            See what your things could earn
          </Link>
        </li>
      </ul>
    </section>
  )
}
