import { Star } from 'lucide-react'
import { useId } from 'react'
import { cx } from '@/lib/cx'

const WORDS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent']

interface Props {
  legend: string
  value: number
  onChange: (n: number) => void
  error?: string
}

/**
 * Choose 1 to 5 stars. Real radio buttons underneath, so arrow keys and
 * screen readers work as usual; each star also says what it means in words.
 */
export function StarInput({ legend, value, onChange, error }: Props) {
  const name = useId()
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined}>
      <legend className="mb-1.5 font-semibold">{legend}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="peer sr-only"
              aria-label={`${n} ${n === 1 ? 'star' : 'stars'}: ${WORDS[n]}`}
            />
            <span className="grid size-11 place-items-center rounded-full peer-hover:bg-sunken peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-solid peer-focus-visible:[outline-color:var(--focus)]">
              <Star aria-hidden="true" strokeWidth={1.75} className={cx('size-7', n <= value ? 'fill-current text-text' : 'text-muted')} />
            </span>
          </label>
        ))}
        <span className="ml-2 min-w-24 font-medium" aria-hidden="true">
          {WORDS[value] ?? ''}
        </span>
      </div>
      {error && (
        <p id={`${name}-err`} className="mt-1.5 text-[0.9375rem] font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
