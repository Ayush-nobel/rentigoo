import { createElement } from 'react'
import type { LucideProps } from 'lucide-react'
import { categoryIcon } from '@/lib/categoryMeta'

export function CategoryIcon({ id, ...props }: { id: string } & LucideProps) {
  return createElement(categoryIcon(id), { 'aria-hidden': true, ...props })
}
