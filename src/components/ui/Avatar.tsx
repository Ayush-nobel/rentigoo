import { initials } from '@/lib/format'
import { cx } from '@/lib/cx'

const sizes = { sm: 'size-8 text-sm', md: 'size-11 text-base', lg: 'size-16 text-xl', xl: 'size-24 text-3xl' }

interface AvatarProps {
  name: string
  src?: string | null
  size?: keyof typeof sizes
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const cls = cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', sizes[size], className)
  if (src) return <img src={src} alt="" className={cx(cls, 'object-cover')} />
  return (
    <span aria-hidden="true" className={cx(cls, 'bg-ink font-display font-bold text-on-ink')}>
      {initials(name)}
    </span>
  )
}
