import { Link } from 'react-router'
import { cx } from '@/lib/cx'

type Size = 'sm' | 'md' | 'lg'

interface LogoProps {
  /** sm for the nav (icon about 28px), md, lg for the hero or auth pages. */
  size?: Size
  /** Which background it sits on. Leave it out to follow the page (light page, dark theme, or a dark strip). */
  variant?: 'light' | 'dark'
  /** Just the R, no wordmark. */
  iconOnly?: boolean
  /** Link to the home page (default true). */
  link?: boolean
  className?: string
}

const SIZES: Record<Size, { icon: string; text: string; gap: string }> = {
  sm: { icon: 'h-7', text: 'text-[1.4rem]', gap: 'gap-2' },
  md: { icon: 'h-9', text: 'text-[1.8rem]', gap: 'gap-2.5' },
  lg: { icon: 'h-12', text: 'text-[2.4rem]', gap: 'gap-3' },
}

/**
 * The RentiGoo logo: the R icon (public/brand/r-icon.png, unchanged from the
 * supplied artwork; r-icon-on-dark.png has the light leg for dark backgrounds)
 * and "RentiGoo" as live text in Nunito 800, in one colour (--wordmark).
 * Under 360px wide only the R shows; the name stays readable for screen readers.
 */
export function Logo({ size = 'sm', variant, iconOnly = false, link = true, className }: LogoProps) {
  const s = SIZES[size]
  const icon = (src: string, extra?: string) => <img src={src} alt="" width={156} height={192} className={cx(s.icon, 'w-auto shrink-0', extra)} />
  const content = (
    <>
      {variant === 'light' ? icon('/brand/r-icon.png') : variant === 'dark' ? icon('/brand/r-icon-on-dark.png') : (
        <>
          {icon('/brand/r-icon.png', 'on-light-only')}
          {icon('/brand/r-icon-on-dark.png', 'on-dark-only')}
        </>
      )}
      <span
        className={cx(
          'font-wordmark leading-none font-extrabold tracking-[-0.02em]',
          s.text,
          variant === 'light' ? 'text-[color:var(--brand-ink)]' : variant === 'dark' ? 'text-[color:var(--page-bg)]' : 'text-wordmark',
          iconOnly ? 'sr-only' : 'max-[359px]:sr-only',
        )}
      >
        RentiGoo
      </span>
    </>
  )
  const classes = cx('inline-flex items-center', s.gap, className)
  return link ? (
    <Link to="/" aria-label="RentiGoo home" className={cx(classes, 'min-h-11 rounded-lg')}>
      {content}
    </Link>
  ) : (
    <span className={classes}>{content}</span>
  )
}
