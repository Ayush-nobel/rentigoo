import { useMemo, useState } from 'react'
import { rentVsBuy, rentVsBuyMonthly } from '@shared/calculators'
import { CATEGORIES, getCategory } from '@shared/categories'
import { FEES } from '@shared/fees'
import type { RentalTerm } from '@shared/types'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Radio } from '@/components/ui/Checkbox'
import { SelectField, SliderField } from '@/components/ui/Field'
import { TermSwitch } from '@/components/ui/TermSwitch'
import { plural, rupees } from '@/lib/format'
import { NumberInput } from './NumberInput'

const DEFAULT = 'cameras'

/** How often you'd use it, in days a year. "Custom" lets you type a number. */
const HOW_OFTEN = [
  { id: 'few', label: 'A few times a year', days: 4 },
  { id: 'monthly', label: 'Once a month', days: 12 },
  { id: 'weekly', label: 'Every week', days: 52 },
  { id: 'custom', label: 'Custom', days: null },
] as const
type HowOften = (typeof HOW_OFTEN)[number]['id']

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
  const [howOften, setHowOften] = useState<HowOften>('few')
  const [customDays, setCustomDays] = useState(20)
  const [years, setYears] = useState(2)
  const [term, setTerm] = useState<RentalTerm>('days')
  const [months, setMonths] = useState(6)

  const daysPerYear = HOW_OFTEN.find((h) => h.id === howOften)?.days ?? customDays
  const set = (k: keyof typeof values) => (n: number) => setValues((v) => ({ ...v, [k]: n }))
  const r = useMemo(() => rentVsBuy({ ...values, daysPerYear, years }), [values, daysPerYear, years])
  const m = useMemo(() => rentVsBuyMonthly({ ...values, months }), [values, months])
  const monthly = term === 'months'
  const over = monthly ? plural(months, 'month') : plural(years, 'year')

  // The answer in one short line, and one line of detail under it.
  let answer: string
  let detail = ''
  if (monthly) {
    if (m.buyCost === 0 && m.rentCost === 0) answer = 'Add a price to see the answer.'
    else if (m.cheaper === 'rent') {
      answer = `Rent it. You’d save about ${rupees(m.savings)}.`
      detail = m.breakEvenMonths === null ? 'Renting stays cheaper however long you need it.' : `Buying only wins if you need it for more than ${plural(m.breakEvenMonths, 'month')}.`
    } else if (m.cheaper === 'buy') {
      answer = `Buy it. Renting would cost about ${rupees(-m.savings)} more.`
      detail = m.breakEvenMonths ? `Renting wins if you need it for ${plural(m.breakEvenMonths, 'month')} or less.` : ''
    } else answer = 'About the same either way.'
  } else if (r.buyCost === 0 && r.rentCost === 0) answer = 'Add a price to see the answer.'
  else if (r.cheaper === 'rent') {
    answer = `Rent it. You’d save about ${rupees(r.savings)}.`
    detail = `Buying only wins if you use it more than ${plural(r.breakEvenDaysPerYear, 'day')} a year.`
  } else if (r.cheaper === 'buy') {
    answer = `Buy it. Renting would cost about ${rupees(-r.savings)} more.`
    detail = `Renting wins if you use it ${plural(r.breakEvenDaysPerYear, 'day')} a year or less.`
  } else answer = 'About the same either way.'

  return (
    <div>
      <section aria-label="The answer" className="card rounded-[28px] p-5 sm:p-8">
        <div aria-live="polite">
          <p className="font-display text-3xl leading-tight font-semibold text-balance sm:text-5xl">{answer}</p>
          {detail && <p className="mt-3 text-lg text-muted">{detail}</p>}
        </div>
        <CostBars buy={monthly ? m.buyCost : r.buyCost} rent={monthly ? m.rentCost : r.rentCost} over={over} />
        <p className="mt-5 text-[0.9375rem] text-muted">
          An estimate over {over}. Buying is the price, minus what you’d sell it for, plus upkeep.{' '}
          {FEES.serviceFeePct > 0 ? `Renting includes our ${FEES.serviceFeePct}% service fee.` : 'Renting is just the owner’s price: we charge no fees right now.'} Deposits come
          back, so they aren’t counted.
        </p>
      </section>

      <section aria-labelledby="adjust-title" className="mt-12">
        <h2 id="adjust-title" className="text-3xl">
          Adjust the numbers
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <TermSwitch className="sm:col-span-2 sm:max-w-sm" legend="How you’d rent it" value={term} onChange={setTerm} />
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
          {monthly ? (
            <>
              <NumberInput label="Rent per month" value={values.monthlyRate} onChange={set('monthlyRate')} hint="Our rough estimate. Change it if you know better." />
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
              <NumberInput label="Rent per day" value={values.dailyRate} onChange={set('dailyRate')} hint="Our rough estimate. Change it if you know better." />
              <fieldset className="sm:col-span-2">
                <legend className="mb-1 font-semibold">How often would you use it?</legend>
                <div className="grid gap-1 sm:grid-cols-2">
                  {HOW_OFTEN.map((h) => (
                    <Radio key={h.id} name="how-often" label={h.label} checked={howOften === h.id} onChange={() => setHowOften(h.id)} />
                  ))}
                </div>
                {howOften === 'custom' && (
                  <div className="mt-3 sm:max-w-xs">
                    <NumberInput label="Days a year" prefix="" max={365} value={customDays} onChange={setCustomDays} />
                  </div>
                )}
              </fieldset>
              <SliderField label="For how many years" value={years} min={1} max={5} onChange={setYears} format={(v) => plural(v, 'year')} />
            </>
          )}
        </div>

        <details className="card smooth mt-6 rounded-2xl px-4 py-3">
          <summary className="cursor-pointer rounded font-semibold">Advanced</summary>
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
      </section>
    </div>
  )
}

/** Two labelled bars: values are always written out, so the bars only support the text. */
function CostBars({ buy, rent, over }: { buy: number; rent: number; over: string }) {
  const max = Math.max(buy, rent, 1)
  const rows = [
    { label: 'Buying', value: buy, bar: 'bg-ink' },
    { label: 'Renting', value: rent, bar: 'bg-accent border border-accent-edge' },
  ]
  return (
    <ul className="mt-7 space-y-4" aria-label={`Total cost over ${over}`}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold">{row.label}</span>
            <AnimatedNumber value={row.value} format={rupees} className="font-display text-xl font-semibold tabular-nums" />
          </div>
          <div className="mt-1.5 h-3.5 rounded-[4px] bg-surface" aria-hidden="true">
            <div className={`h-full rounded-[4px] transition-[width] duration-300 ${row.bar}`} style={{ width: `${Math.max(1.5, (row.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
