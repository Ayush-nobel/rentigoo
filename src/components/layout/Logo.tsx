import { Link } from 'react-router'
import { cx } from '@/lib/cx'
import { LOGO } from './logoPaths'

type Variant = 'wordmark' | 'mark' | 'full'

interface LogoArtProps {
  variant?: Variant
  className?: string
  /** Accessible name; pass '' when a surrounding link already names it. */
  title?: string
}

/**
 * The RentiGoo logo, traced from public/brand/Rentigoo.jpeg. Yellow stays the
 * brand yellow; the dark parts follow the theme (ink on light, white on dark).
 * - wordmark: R + "rentigoo" (header)
 * - full: with the "Rent anything, anywhere" line (large placements only)
 * - mark: just the R
 */
export function LogoArt({ variant = 'wordmark', className, title = 'RentiGoo' }: LogoArtProps) {
  const width = variant === 'mark' ? LOGO.markWidth : LOGO.width
  return (
    <svg
      viewBox={`0 0 ${width} ${LOGO.height}`}
      className={cx('block h-full w-auto', className)}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={LOGO.markYellow} fill="var(--accent)" />
      <path d={LOGO.markInk} fill="var(--logo-ink)" />
      {variant !== 'mark' && (
        <>
          <path d={LOGO.wordInk} fill="var(--logo-ink)" />
          <path d={LOGO.wordYellow} fill="var(--accent)" />
        </>
      )}
      {variant === 'full' && <path d={LOGO.tagline} fill="var(--muted)" />}
    </svg>
  )
}

/** Logo linking home, as used in the header and footer. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="RentiGoo home" className={cx('inline-flex h-11 items-center rounded-lg sm:h-12', className)}>
      <LogoArt title="" />
    </Link>
  )
}
