import { useMemo, useState } from 'react'
import { ownerEarnings } from '@shared/calculators'
import { CATEGORIES, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import { plural, rupees } from '@/lib/format'
import { ButtonLink } from '../ui/Button'
import { SelectField, SliderField } from '../ui/Field'
import { NumberInput } from './NumberInput'

const DEFAULT = 'party'

export function EarningsEstimator() {
  const [categoryId, setCategoryId] = useState(DEFAULT)
  const [dailyRate, setDailyRate] = useState(() => getCategory(DEFAULT)!.avgDailyRate)
  const [itemValue, setItemValue] = useState(() => getCategory(DEFAULT)!.avgPurchasePrice)
  const [daysPerMonth, setDaysPerMonth] = useState(6)

  const r = useMemo(() => ownerEarnings({ dailyRate, daysPerMonth, itemValue }), [dailyRate, daysPerMonth, itemValue])

  const payback =
    r.monthsToPayBack === null
      ? 'Rent it out a few days a month to start earning.'
      : r.monthsToPayBack <= 1
        ? 'It would pay for itself within a month.'
        : `It would pay for itself in about ${plural(Math.ceil(r.monthsToPayBack), 'month')}.`

  return (
    <section aria-labelledby="earn-title" className="rounded-[28px] bg-accent p-5 text-on-accent sm:p-8">
      <h2 id="earn-title" className="text-3xl">
        What could your things earn?
      </h2>
      <p className="mt-2">That speaker in the cupboard has a second job waiting.</p>

      <div className="mt-6 grid gap-5 rounded-2xl bg-surface p-4 text-text sm:p-5">
        <SelectField
          label="What would you rent out?"
          value={categoryId}
          onChange={(e) => {
            const c = getCategory(e.target.value)!
            setCategoryId(c.id)
            setDailyRate(c.avgDailyRate)
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
          <NumberInput label="Your daily rate" value={dailyRate} onChange={setDailyRate} hint="Prefilled with the typical rate" />
        </div>
        <SliderField
          label="Days rented each month"
          value={daysPerMonth}
          min={0}
          max={30}
          onChange={setDaysPerMonth}
          format={(v) => plural(v, 'day')}
        />
      </div>

      <div className="mt-6" aria-live="polite">
        <p className="text-lg font-semibold">You could earn about</p>
        <p className="font-display text-6xl leading-none font-extrabold tabular-nums">
          {rupees(r.netMonthly)}
          <span className="ml-2 font-sans text-xl font-semibold">a month</span>
        </p>
        <p className="mt-3 text-lg">
          That’s {rupees(r.netYearly)} a year. {payback}
        </p>
      </div>
      <p className="mt-4 text-[0.9375rem]">
        An estimate, not a promise. It’s after our {FEES.ownerCommissionPct}% commission. Listing is free.
      </p>
      <ButtonLink to="/list" variant="ink" size="lg" className="mt-6">
        List an item
      </ButtonLink>
    </section>
  )
}
