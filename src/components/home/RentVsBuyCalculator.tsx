import { useMemo, useState } from 'react'
import { rentVsBuy, rentVsBuyMonthly } from '@shared/calculators'
import { CATEGORIES, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import { plural, rupees } from '@/lib/format'
import { SelectField, SliderField } from '../ui/Field'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { NumberInput } from './NumberInput'
import { TermSwitch } from '../ui/TermSwitch'
import type { RentalTerm } from '@shared/types'

const DEFAULT = 'cameras'

function defaultsFor(categoryId: string) {
  const c = getCategory(categoryId) ?? CATEGORIES[0]!
  return {
    purchasePrice: c.avgPurchasePrice,
    dailyRate: c.avgDailyRate,
    monthlyRate: c.avgMonthlyRate,
    resalePct: c.typicalResalePct,
    upkeepPerYear: c.typicalUpkeepPerYear,
  }
}

export function RentVsBuyCalculator() {
  const [categoryId, setCategoryId] = useState(DEFAULT)
  const [values, setValues] = useState(() => defaultsFor(DEFAULT))
  const [daysPerYear, setDaysPerYear] = useState(10)
  const [years, setYears] = useState(2)
  const [term, setTerm] = useState<RentalTerm>('days')
  const [months, setMonths] = useState(6)

  const set = (k: keyof typeof values) => (n: number) => setValues((v) => ({ ...v, [k]: n }))
  const r = useMemo(() => rentVsBuy({ ...values, daysPerYear, years }), [values, daysPerYear, years])
  const m = useMemo(() => rentVsBuyMonthly({ ...values, months }), [values, months])
  const yearsText = plural(years, 'year')
  const monthsText = plural(months, 'month')

  let verdict: string
  if (term === 'months') {
    if (m.buyCost === 0 && m.rentCost === 0) verdict = 'Add a price to see which works out cheaper.'
    else if (m.cheaper === 'rent')
      verdict = `Rent it. You’d save ${rupees(m.savings)} over ${monthsText}. ${
        m.breakEvenMonths === null ? 'Renting stays cheaper however long you need it.' : `Buying only wins if you need it for more than ${plural(m.breakEvenMonths, 'month')}.`
      }`
    else if (m.cheaper === 'buy')
      verdict = `Buy it. For ${monthsText}, renting would cost ${rupees(-m.savings)} more. ${
        m.breakEvenMonths ? `Renting wins for ${plural(m.breakEvenMonths, 'month')} or less.` : 'Renting only makes sense for a very short time.'
      }`
    else verdict = 'It’s a draw. Rent if you’d rather not sell it afterwards.'
  } else if (r.buyCost === 0 && r.rentCost === 0) verdict = 'Add a price to see which works out cheaper.'
  else if (r.cheaper === 'rent')
    verdict = `Rent it. You’d save ${rupees(r.savings)} over ${yearsText}. Buying only wins if you need it more than ${plural(r.breakEvenDaysPerYear, 'day')} a year.`
  else if (r.cheaper === 'buy')
    verdict = `Buy it. At ${plural(daysPerYear, 'day')} a year, renting would cost ${rupees(-r.savings)} more over ${yearsText}. Renting wins below ${plural(r.breakEvenDaysPerYear + 1, 'day')} a year.`
  else verdict = 'It’s a draw. Rent if you’d rather not store it.'

  return (
    <section aria-labelledby="rvb-title" className="rounded-[28px] bg-sunken p-5 sm:p-10">
      <h2 id="rvb-title" className="text-3xl">
        Rent it or buy it?
      </h2>
      <p className="mt-2 text-muted">Most things get used a few days a year, or for a few months while you’re somewhere. Put in yours and see what makes sense.</p>

      <TermSwitch className="mt-5 max-w-sm" legend="How you’d rent it" value={term} onChange={setTerm} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <SelectField
          label="What is it?"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setValues(defaultsFor(e.target.value))
          }}
          className="sm:col-span-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <NumberInput label="Price to buy new" value={values.purchasePrice} onChange={set('purchasePrice')} />
        {term === 'months' ? (
          <>
            <NumberInput label="Rent per month" value={values.monthlyRate} onChange={set('monthlyRate')} hint="Prefilled with our rough estimate" />
            <SliderField
              label="How long you need it"
              value={months}
              min={1}
              max={24}
              onChange={setMonths}
              format={(v) => plural(v, 'month')}
              className="sm:col-span-2"
            />
          </>
        ) : (
          <>
            <NumberInput label="Rent per day" value={values.dailyRate} onChange={set('dailyRate')} hint="Prefilled with our rough estimate" />
            <SliderField
              label="Days you’d use it"
              value={daysPerYear}
              min={1}
              max={120}
              onChange={setDaysPerYear}
              format={(v) => `${plural(v, 'day')} a year`}
            />
            <SliderField label="For how long" value={years} min={1} max={5} onChange={setYears} format={(v) => plural(v, 'year')} />
          </>
        )}
      </div>

      <details className="smooth group mt-5 rounded-2xl bg-surface px-4 py-3">
        <summary className="cursor-pointer rounded font-semibold">Resale value and upkeep</summary>
        <div className="mt-4 grid gap-5 pb-2 sm:grid-cols-2">
          <NumberInput
            label="Resale value at the end"
            prefix="%"
            max={100}
            value={values.resalePct}
            onChange={set('resalePct')}
            hint="Share of the price you’d get selling it"
          />
          <NumberInput label="Upkeep per year" value={values.upkeepPerYear} onChange={set('upkeepPerYear')} hint="Servicing, batteries, storage" />
        </div>
      </details>

      <div className="mt-7 border-t border-line pt-6">
        <p aria-live="polite" className="font-display text-2xl leading-snug font-bold text-balance">
          {verdict}
        </p>
        <CostBars buy={term === 'months' ? m.buyCost : r.buyCost} rent={term === 'months' ? m.rentCost : r.rentCost} over={term === 'months' ? monthsText : yearsText} />
        <p className="mt-4 text-sm text-muted">
          {FEES.serviceFeePct > 0
            ? `Renting includes our ${FEES.serviceFeePct}% service fee${FEES.gstOnFeePct > 0 ? ' and GST on it' : ''}.`
            : 'RentiGoo charges no fees right now, so renting costs just the owner’s price.'}{' '}
          Buying is the price minus what you’d sell it for, plus upkeep{term === 'months' ? ' while you have it' : ''}. Deposits come back, so they’re not counted.
        </p>
      </div>
    </section>
  )
}

/** Two labelled bars: values are always written out, so the bars only support the text. */
function CostBars({ buy, rent, over }: { buy: number; rent: number; over: string }) {
  const max = Math.max(buy, rent, 1)
  const rows = [
    { label: 'Buying', value: buy, bar: 'bg-ink' },
    { label: 'Renting on RentiGoo', value: rent, bar: 'bg-accent border border-accent-edge' },
  ]
  return (
    <ul className="mt-6 space-y-4" aria-label={`Total cost over ${over}`}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{row.label}</span>
            <AnimatedNumber value={row.value} format={rupees} className="font-display text-xl font-bold tabular-nums" />
          </div>
          <div className="mt-1.5 h-3.5 rounded-[4px] bg-surface" aria-hidden="true">
            <div
              className={`h-full rounded-[4px] transition-[width] duration-300 ${row.bar}`}
              style={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
