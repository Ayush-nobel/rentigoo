import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UserProfile } from '@shared/types'
import { api, auth } from '@/lib'
import { setSessionUserId } from '@/lib/session'

type Status = 'loading' | 'signed-out' | 'needs-profile' | 'signed-in'

interface AuthState {
  status: Status
  /** The profile, once signed in and set up. */
  user: UserProfile | null
  /** True until we know whether someone is signed in. */
  loading: boolean
  /** Signed in, but hasn't told us their name and area yet. */
  needsProfile: boolean
  /** Re-read the session and profile (after sign-in, sign-up or profile changes). */
  refresh: () => Promise<Status>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function readSession(): Promise<{ status: Exclude<Status, 'loading'>; user: UserProfile | null }> {
  const id = await auth.currentUserId()
  setSessionUserId(id)
  if (!id) return { status: 'signed-out', user: null }
  const user = await api.getUser(id).catch(() => null)
  return { status: user ? 'signed-in' : 'needs-profile', user }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)

  const refresh = useCallback(async (): Promise<Status> => {
    const s = await readSession()
    setUser(s.user)
    setStatus(s.status)
    return s.status
  }, [])

  useEffect(() => {
    let live = true
    readSession().then((s) => {
      if (!live) return
      setUser(s.user)
      setStatus(s.status)
    })
    // Signed out in another tab, or the session expired.
    const off = auth.onChange(() => void refresh())
    return () => {
      live = false
      off()
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    await auth.signOut().catch(() => {})
    setSessionUserId(null)
    setUser(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo<AuthState>(
    () => ({ status, user, loading: status === 'loading', needsProfile: status === 'needs-profile', refresh, signOut }),
    [status, user, refresh, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
