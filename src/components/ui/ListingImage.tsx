import type { Photo } from '@shared/types'
import { cx } from '@/lib/cx'
import { createElement } from 'react'
import { CATEGORY_TONES, categoryIcon } from '@/lib/categoryMeta'

interface ListingImageProps {
  photo: Photo | undefined
  className?: string
  /** Eager-load images above the fold. */
  priority?: boolean
  sizes?: string
  /** Hide from screen readers when a surrounding control already names it. */
  decorative?: boolean
}

/** Placeholder art variants: icon position and scale per photo index. */
const VARIANTS = [
  { x: '50%', y: '52%', scale: 0.42, rotate: -8 },
  { x: '62%', y: '45%', scale: 0.55, rotate: 6 },
  { x: '40%', y: '58%', scale: 0.36, rotate: -2 },
  { x: '55%', y: '50%', scale: 0.48, rotate: 12 },
]

/**
 * Shows a real photo (URL or S3 key, wired up in step 7) or, for seed data,
 * a built-in illustration keyed `ph:<categoryId>:<n>`.
 */
export function ListingImage({ photo, className, priority, sizes, decorative }: ListingImageProps) {
  if (photo && !photo.key.startsWith('ph:')) {
    return (
      <img
        src={photo.key}
        alt={decorative ? '' : photo.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        sizes={sizes}
        className={cx('h-full w-full object-cover', className)}
      />
    )
  }

  const [, categoryId = '', n = '0'] = (photo?.key ?? 'ph::0').split(':')
  const tone = CATEGORY_TONES[categoryId] ?? '#c9bfa8'
  const v = VARIANTS[Number(n) % VARIANTS.length]!

  return (
    <div
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : (photo?.alt ?? 'No photo yet')}
      aria-hidden={decorative || undefined}
      className={cx('relative h-full w-full overflow-hidden', className)}
      style={{ background: `color-mix(in oklab, ${tone} 38%, var(--surface))` }}
    >
      <div
        className="absolute rounded-full"
        style={{
          width: '70%',
          aspectRatio: '1',
          left: v.x,
          top: v.y,
          transform: 'translate(-50%, -50%)',
          background: `color-mix(in oklab, ${tone} 55%, var(--surface))`,
        }}
      />
      {createElement(categoryIcon(categoryId), {
        'aria-hidden': true,
        strokeWidth: 1.25,
        className: 'absolute text-text/70',
        style: {
          width: `${v.scale * 100}%`,
          height: `${v.scale * 100}%`,
          left: v.x,
          top: v.y,
          transform: `translate(-50%, -50%) rotate(${v.rotate}deg)`,
        },
      })}
    </div>
  )
}
