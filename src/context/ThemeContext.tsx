import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readString, writeString } from '@/lib/storage'

export type ThemeChoice = 'system' | 'light' | 'dark'

interface ThemeState {
  choice: ThemeChoice
  /** What's actually showing right now. */
  resolved: 'light' | 'dark'
  setChoice: (c: ThemeChoice) => void
  /** Cycle system → light → dark. */
  cycle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const KEY = 'theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function initialChoice(): ThemeChoice {
  const saved = readString(KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(initialChoice)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const mq = media()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (choice === 'system') delete root.dataset.theme
    else root.dataset.theme = choice
    writeString(KEY, choice === 'system' ? null : choice)
  }, [choice])

  const setChoice = useCallback((c: ThemeChoice) => setChoiceState(c), [])
  const cycle = useCallback(
    () => setChoiceState((c) => (c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system')),
    [],
  )

  const value = useMemo<ThemeState>(
    () => ({ choice, resolved: choice === 'system' ? (systemDark ? 'dark' : 'light') : choice, setChoice, cycle }),
    [choice, systemDark, setChoice, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
