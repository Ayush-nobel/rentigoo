import { useMemo, useState } from 'react'
import { ownerEarnings, ownerEarningsMonthly } from '@shared/calculators'
import { CATEGORIES, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import { plural, rupees } from '@/lib/format'
import { ButtonLink } from '../ui/Button'
import { SelectField, SliderField } from '../ui/Field'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { NumberInput } from './NumberInput'
import { TermSwitch } from '../ui/TermSwitch'
import type { RentalTerm } from '@shared/types'

const DEFAULT = 'party'

export function EarningsEstimator() {
  const [categoryId, setCategoryId] = useState(DEFAULT)
  const [dailyRate, setDailyRate] = useState(() => getCategory(DEFAULT)!.avgDailyRate)
  const [itemValue, setItemValue] = useState(() => getCategory(DEFAULT)!.avgPurchasePrice)
  const [daysPerMonth, setDaysPerMonth] = useState(6)
  const [term, setTerm] = useState<RentalTerm>('days')
  const [monthlyRate, setMonthlyRate] = useState(() => getCategory(DEFAULT)!.avgMonthlyRate)
  const [monthsPerYear, setMonthsPerYear] = useState(8)
  const monthly = term === 'months'

  const r = useMemo(
    () => (monthly ? ownerEarningsMonthly({ monthlyRate, monthsPerYear, itemValue }) : ownerEarnings({ dailyRate, daysPerMonth, itemValue })),
    [monthly, monthlyRate, monthsPerYear, dailyRate, daysPerMonth, itemValue],
  )

  const payback =
    r.monthsToPayBack === null
      ? monthly
        ? 'Rent it out for a few months a year to start earning.'
        : 'Rent it out a few days a month to start earning.'
      : r.monthsToPayBack <= 1
        ? `It would pay for itself within ${monthly ? 'its first month out' : 'a month'}.`
        : `It would pay for itself in about ${plural(Math.ceil(r.monthsToPayBack), 'month')}${monthly ? ' of renting' : ''}.`

  return (
    <section aria-labelledby="earn-title" className="rounded-[28px] bg-accent p-5 text-on-accent sm:p-10">
      <h2 id="earn-title" className="text-3xl">
        What could your things earn?
      </h2>
      <p className="mt-2">That speaker in the cupboard has a second job waiting.</p>

      <div className="mt-6 grid gap-5 rounded-2xl bg-surface p-4 text-text sm:p-5">
        <TermSwitch legend="How you’d rent it out" value={term} onChange={setTerm} />
        <SelectField
          label="What would you rent out?"
          value={categoryId}
          onChange={(e) => {
            const c = getCategory(e.target.value)!
            setCategoryId(c.id)
            setDailyRate(c.avgDailyRate)
            setMonthlyRate(c.avgMonthlyRate)
            setItemValue(c.avgPurchasePrice)
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberInput label="What it’s worth" value={itemValue} onChange={setItemValue} />
          {monthly ? (
            <NumberInput label="Your monthly rate" value={monthlyRate} onChange={setMonthlyRate} hint="Prefilled with our rough estimate" />
          ) : (
            <NumberInput label="Your daily rate" value={dailyRate} onChange={setDailyRate} hint="Prefilled with our rough estimate" />
          )}
        </div>
        {monthly ? (
          <SliderField
            label="Months rented each year"
            value={monthsPerYear}
            min={0}
            max={12}
            onChange={setMonthsPerYear}
            format={(v) => plural(v, 'month')}
          />
        ) : (
          <SliderField
            label="Days rented each month"
            value={daysPerMonth}
            min={0}
            max={30}
            onChange={setDaysPerMonth}
            format={(v) => plural(v, 'day')}
          />
        )}
      </div>

      <div className="mt-6" aria-live="polite">
        <p className="text-lg font-semibold">You could earn about</p>
        <p className="font-display text-6xl leading-none font-extrabold tabular-nums">
          <AnimatedNumber value={r.netMonthly} format={rupees} />
          <span className="ml-2 font-sans text-xl font-semibold">a month</span>
        </p>
        <p className="mt-3 text-lg">
          {monthly ? `Averaged over the year: ${rupees(r.netYearly)} a year.` : `That’s ${rupees(r.netYearly)} a year.`} {payback}
        </p>
      </div>
      <p className="mt-4 text-[0.9375rem]">
        An estimate, not a promise.{' '}
        {FEES.ownerCommissionPct > 0 ? `It’s after our ${FEES.ownerCommissionPct}% commission. ` : 'RentiGoo takes no commission right now, so you keep all of it. '}
        Listing is free.
      </p>
      <ButtonLink to="/list" variant="ink" size="lg" className="mt-6">
        List an item
      </ButtonLink>
    </section>
  )
}
