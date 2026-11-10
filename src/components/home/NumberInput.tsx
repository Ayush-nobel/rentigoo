import { useState } from 'react'
import { TextField } from '../ui/Field'
import { number } from '@/lib/format'

interface Props {
  label: string
  value: number
  onChange: (n: number) => void
  hint?: string
  prefix?: string
  max?: number
}

/**
 * Rupee/number input that shows Indian grouping (1,25,000) when you're not
 * typing, and accepts digits only.
 */
export function NumberInput({ label, value, onChange, hint, prefix = '₹', max = 99_99_999 }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <TextField
      label={label}
      hint={hint}
      prefix={prefix}
      inputMode="numeric"
      autoComplete="off"
      value={draft ?? (value ? number(value) : '')}
      onFocus={() => setDraft(value ? String(value) : '')}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
        setDraft(digits)
        onChange(Math.min(max, Number(digits) || 0))
      }}
    />
  )
}
