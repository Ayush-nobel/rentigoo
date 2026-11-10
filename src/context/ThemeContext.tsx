import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
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
const QUERY = '(prefers-color-scheme: dark)'

// The saved choice lives in localStorage; this tiny store lets React read it in
// a hydration-safe way (the server, and the first client render, see "system").
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function readChoice(): ThemeChoice {
  const saved = readString(KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

function writeChoice(c: ThemeChoice) {
  const root = document.documentElement
  if (c === 'system') delete root.dataset.theme
  else root.dataset.theme = c
  writeString(KEY, c === 'system' ? null : c)
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

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const choice = useSyncExternalStore(subscribeChoice, readChoice, () => 'system' as ThemeChoice)
  const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia(QUERY).matches, () => false)

  const setChoice = useCallback((c: ThemeChoice) => writeChoice(c), [])
  const cycle = useCallback(() => {
    const c = readChoice()
    writeChoice(c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system')
  }, [])

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
