import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'ink' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  ink: 'bg-ink text-on-ink hover:opacity-90',
  outline: 'border border-line-strong bg-surface text-text hover:border-text',
  ghost: 'text-text hover:bg-sunken',
  danger: 'border border-danger/50 text-danger hover:bg-danger/10',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-[0.9375rem]',
  md: 'min-h-11 px-5 text-base',
  lg: 'min-h-13 px-7 text-lg',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cx(base, variants[variant], sizes[size], className)
}
