import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

const LABELS = { system: 'Theme: matches your device', light: 'Theme: light', dark: 'Theme: dark' }

export function ThemeToggle() {
  const { choice, cycle } = useTheme()
  const Icon = choice === 'system' ? Monitor : choice === 'light' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={cycle}
      className="grid size-11 place-items-center rounded-full text-text hover:bg-sunken"
      aria-label={`${LABELS[choice]}. Change theme`}
      title={LABELS[choice]}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}
