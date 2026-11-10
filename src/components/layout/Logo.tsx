import { Link } from 'react-router'
import { cx } from '@/lib/cx'

/**
 * Text wordmark until the real logo files land in /public/brand.
 * To swap: render <img src="/brand/logo.svg" alt="RentiGoo"> here instead.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('inline-flex items-center gap-2 rounded-lg', className)} aria-label="RentiGoo home">
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-[11px] bg-accent font-display text-xl font-extrabold text-on-accent">
        R
      </span>
      <span aria-hidden="true" className="font-display text-[1.6rem] leading-none font-extrabold tracking-tight">
        Renti<span className="text-accent-text">Goo</span>
      </span>
    </Link>
  )
}
