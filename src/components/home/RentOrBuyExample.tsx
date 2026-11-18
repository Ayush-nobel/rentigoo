import { Link } from 'react-router'
import { areaName } from '@shared/areas'
import { rentVsBuy } from '@shared/calculators'
import { getCategory } from '@shared/categories'
import type { Listing } from '@shared/types'
import { rupees } from '@/lib/format'

const WEEKEND_DAYS = 3

/**
 * One worked example: a DSLR for a wedding weekend. Uses a real camera listing's
 * daily price when there is one; otherwise our typical-price estimate, and says so.
 * Either way the sum is shown, so nobody has to guess where the number came from.
 */
export function RentOrBuyExample({ listings = [] }: { listings?: Listing[] }) {
  const camera = getCategory('cameras')!
  const real = listings.find((l) => l.categoryId === 'cameras' && l.pricing.daily)
  const daily = real?.pricing.daily ?? camera.avgDailyRate
  const rent = rentVsBuy({ purchasePrice: camera.avgPurchasePrice, resalePct: 0, upkeepPerYear: 0, years: 1, dailyRate: daily, daysPerYear: WEEKEND_DAYS }).rentCost
  return (
    <section aria-label="Renting or buying" className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="reveal max-w-3xl font-display text-2xl leading-snug font-semibold sm:text-4xl">
        A camera for a wedding weekend: {rupees(rent)} to rent, about {rupees(camera.avgPurchasePrice)} to buy.
      </p>
      <p className="mt-3 max-w-2xl text-muted">
        {real ? (
          <>
            <Link to={`/listing/${real.id}`} className="font-semibold text-text underline underline-offset-4">
              {real.title}
            </Link>{' '}
            in {areaName(real.areaId)} rents for {rupees(daily)} a day, so {WEEKEND_DAYS} days come to {rupees(rent)}.
          </>
        ) : (
          // TODO(founder): confirm these figures (3 days at ₹750/day; ₹85,000 for a new DSLR with a lens). They come from
          // the camera estimates in shared/categories.ts. Your brief said "entry-level DSLR", but those cost about ₹40–50k.
          <>Based on {WEEKEND_DAYS} days at {rupees(daily)}/day vs a new mid-range DSLR with a lens.</>
        )}{' '}
        Both are our estimates for Bhopal, and you get the deposit back.
      </p>
      <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
        <li>
          <Link to="/rent-or-buy" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
            Rent or buy calculator
          </Link>
        </li>
        <li>
          <Link to="/earn" className="inline-flex min-h-11 items-center rounded font-semibold underline underline-offset-4 hover:no-underline">
            What could you earn?
          </Link>
        </li>
      </ul>
    </section>
  )
}
