import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { readString, writeString } from '@/lib/storage'

/** Light unless the person picks dark (we no longer follow the device setting). */
export type ThemeChoice = 'light' | 'dark'

interface ThemeState {
  choice: ThemeChoice
  /** What's actually showing right now. */
  resolved: 'light' | 'dark'
  setChoice: (c: ThemeChoice) => void
  /** Switch between light and dark. */
  cycle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)
const KEY = 'theme'

// The saved choice lives in localStorage; this tiny store lets React read it in
// a hydration-safe way (the server, and the first client render, see "light").
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function readChoice(): ThemeChoice {
  const saved = readString(KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

function writeChoice(c: ThemeChoice) {
  const root = document.documentElement
  if (c === 'light') delete root.dataset.theme
  else root.dataset.theme = c
  writeString(KEY, c === 'light' ? null : c)
  notify()
}

function subscribeChoice(cb: () => void) {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => e.key?.endsWith(KEY) && cb()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => 'light' as ThemeChoice)

  const setChoice = useCallback((c: ThemeChoice) => writeChoice(c), [])
  const cycle = useCallback(() => {
    writeChoice(readChoice() === 'light' ? 'dark' : 'light')
  }, [])

  const value = useMemo<ThemeState>(
    () => ({ choice, resolved: choice, setChoice, cycle }),
    [choice, setChoice, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
