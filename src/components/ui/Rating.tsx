import { Star } from 'lucide-react'
import { cx } from '@/lib/cx'

interface RatingProps {
  value: number
  count: number
  className?: string
  /** Hide the count, e.g. in tight cards. */
  compact?: boolean
}

export function Rating({ value, count, className, compact }: RatingProps) {
  if (count === 0) {
    return <span className={cx('text-sm text-muted', className)}>New</span>
  }
  return (
    <span className={cx('inline-flex items-center gap-1 text-sm', className)}>
      <Star aria-hidden="true" className="size-4 fill-current" />
      <span className="font-semibold">{value.toFixed(1)}</span>
      {!compact && <span className="text-muted">({count})</span>}
      <span className="sr-only">
        {' '}
        out of 5, from {count} {count === 1 ? 'review' : 'reviews'}
      </span>
    </span>
  )
}
