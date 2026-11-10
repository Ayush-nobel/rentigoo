import { useMemo, useState } from 'react'
import { rentVsBuy } from '@shared/calculators'
import { CATEGORIES, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import { plural, rupees } from '@/lib/format'
import { SelectField, SliderField } from '../ui/Field'
import { NumberInput } from './NumberInput'

const DEFAULT = 'cameras'

function defaultsFor(categoryId: string) {
  const c = getCategory(categoryId) ?? CATEGORIES[0]!
  return {
    purchasePrice: c.avgPurchasePrice,
    dailyRate: c.avgDailyRate,
    resalePct: c.typicalResalePct,
    upkeepPerYear: c.typicalUpkeepPerYear,
  }
}

export function RentVsBuyCalculator() {
  const [categoryId, setCategoryId] = useState(DEFAULT)
  const [values, setValues] = useState(() => defaultsFor(DEFAULT))
  const [daysPerYear, setDaysPerYear] = useState(10)
  const [years, setYears] = useState(2)

  const set = (k: keyof typeof values) => (n: number) => setValues((v) => ({ ...v, [k]: n }))
  const r = useMemo(() => rentVsBuy({ ...values, daysPerYear, years }), [values, daysPerYear, years])
  const yearsText = plural(years, 'year')

  let verdict: string
  if (r.buyCost === 0 && r.rentCost === 0) verdict = 'Add a price to see which works out cheaper.'
  else if (r.cheaper === 'rent')
    verdict = `Rent it. You’d save ${rupees(r.savings)} over ${yearsText}. Buying only wins if you need it more than ${plural(r.breakEvenDaysPerYear, 'day')} a year.`
  else if (r.cheaper === 'buy')
    verdict = `Buy it. At ${plural(daysPerYear, 'day')} a year, renting would cost ${rupees(-r.savings)} more over ${yearsText}. Renting wins below ${plural(r.breakEvenDaysPerYear + 1, 'day')} a year.`
  else verdict = 'It’s a draw. Rent if you’d rather not store it.'

  return (
    <section aria-labelledby="rvb-title" className="rounded-[28px] border border-line bg-surface p-5 sm:p-8">
      <h2 id="rvb-title" className="text-3xl">
        Rent it or buy it?
      </h2>
      <p className="mt-2 text-muted">Most things get used a few days a year. Put in yours and see what makes sense.</p>

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
        <NumberInput label="Rent per day" value={values.dailyRate} onChange={set('dailyRate')} hint="Typical on RentiGoo for this category" />
        <SliderField
          label="Days you’d use it"
          value={daysPerYear}
          min={1}
          max={120}
          onChange={setDaysPerYear}
          format={(v) => `${plural(v, 'day')} a year`}
        />
        <SliderField label="For how long" value={years} min={1} max={5} onChange={setYears} format={(v) => plural(v, 'year')} />
      </div>

      <details className="group mt-5 rounded-2xl bg-sunken px-4 py-3">
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
        <CostBars buy={r.buyCost} rent={r.rentCost} years={years} />
        <p className="mt-4 text-sm text-muted">
          Renting includes our {FEES.serviceFeePct}% service fee and GST on it. Buying is the price minus what you’d sell it for, plus upkeep. Deposits come back, so they’re not counted.
        </p>
      </div>
    </section>
  )
}

/** Two labelled bars: values are always written out, so the bars only support the text. */
function CostBars({ buy, rent, years }: { buy: number; rent: number; years: number }) {
  const max = Math.max(buy, rent, 1)
  const rows = [
    { label: 'Buying', value: buy, bar: 'bg-ink' },
    { label: 'Renting on RentiGoo', value: rent, bar: 'bg-accent border border-accent-edge' },
  ]
  return (
    <ul className="mt-6 space-y-4" aria-label={`Total cost over ${plural(years, 'year')}`}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{row.label}</span>
            <span className="font-display text-xl font-bold tabular-nums">{rupees(row.value)}</span>
          </div>
          <div className="mt-1.5 h-3.5 rounded-[4px] bg-sunken" aria-hidden="true">
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
