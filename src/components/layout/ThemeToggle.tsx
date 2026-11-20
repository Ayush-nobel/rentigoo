import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

/** Light is the default; this switches to dark and back. */
export function ThemeToggle() {
  const { choice, cycle } = useTheme()
  const dark = choice === 'dark'
  const Icon = dark ? Moon : Sun
  return (
    <button
      type="button"
      onClick={cycle}
      className="grid size-11 place-items-center rounded-full text-text hover:bg-sunken"
      aria-label={dark ? 'Dark theme on. Switch to light' : 'Light theme on. Switch to dark'}
      title={dark ? 'Dark theme' : 'Light theme'}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}
