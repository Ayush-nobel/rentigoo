import { Link } from 'react-router'
import { cx } from '@/lib/cx'
import { LOGO_SIZE } from './logoSize'

type Variant = 'wordmark' | 'mark' | 'full'

interface LogoArtProps {
  variant?: Variant
  className?: string
  /** Accessible name; pass '' when a surrounding link already names it. */
  title?: string
}

/**
 * The RentiGoo logo, traced from public/brand/Rentigoo.jpeg, drawn from one
 * shared sprite file (public/brand/logo-sprite.svg) so every page doesn't carry
 * ~47 KB of paths twice; the browser fetches it once and caches it. Yellow stays
 * the brand yellow; the dark parts follow the theme via CSS variables.
 */
export function LogoArt({ variant = 'wordmark', className, title = 'RentiGoo' }: LogoArtProps) {
  const width = variant === 'mark' ? LOGO_SIZE.markWidth : LOGO_SIZE.width
  return (
    <svg
      viewBox={`0 0 ${width} ${LOGO_SIZE.height}`}
      className={cx('block h-full w-auto', className)}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <use href={`/brand/logo-sprite.svg#${variant}`} />
    </svg>
  )
}

/** Logo linking home, as used in the header and footer. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('inline-flex h-11 items-center rounded-lg sm:h-12', className)}>
      <LogoArt title="" />
      <span className="sr-only">RentiGoo home</span>
    </Link>
  )
}
