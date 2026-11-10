import { rupees } from '@/lib/format'
import { cx } from '@/lib/cx'

interface PriceTagProps {
  amount: number
  per?: 'day' | 'week' | 'month' | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'text-[0.95rem]', md: 'text-lg', lg: 'text-2xl' }

/** The RentiGoo rental tag: notched, punched, yellow. */
export function PriceTag({ amount, per = 'day', size = 'md', className }: PriceTagProps) {
  return (
    <span className={cx('price-tag', sizes[size], className)}>
      {rupees(amount)}
      {per && <small>/{per}</small>}
    </span>
  )
}
