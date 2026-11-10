import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-field bg-sunken', className)} />
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cx('mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center', className)}>
      {icon && <div className="mb-4 grid size-16 place-items-center rounded-full bg-sunken text-text">{icon}</div>}
      <h2 className="text-2xl">{title}</h2>
      {children && <div className="mt-2 text-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'danger'; className?: string }) {
  const tones = {
    neutral: 'bg-sunken text-text',
    accent: 'bg-accent text-on-accent',
    success: 'bg-success/12 text-success',
    danger: 'bg-danger/12 text-danger',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium', tones[tone], className)}>{children}</span>
}
