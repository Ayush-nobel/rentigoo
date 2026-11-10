import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UserProfile } from '@shared/types'
import { DEMO_USER_ID } from '@/data/users'
import { api } from '@/lib'
import { setSessionUserId } from '@/lib/session'
import { readString, writeString } from '@/lib/storage'

interface AuthState {
  user: UserProfile | null
  /** True until we know whether someone is signed in. */
  loading: boolean
  /** Mock sign-in as the demo account. Replaced by Cognito in build step 6. */
  signInDemo: () => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const KEY = 'session-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Read the saved session once, and tell the data layer straight away so
  // children's first data calls already know who is signed in.
  const [initialId] = useState(() => {
    const id = readString(KEY)
    setSessionUserId(id)
    return id
  })
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(initialId !== null)

  const load = useCallback(async (userId: string | null) => {
    setSessionUserId(userId)
    const profile = userId ? await api.getUser(userId) : null
    setUser(profile)
  }, [])

  useEffect(() => {
    if (!initialId) return
    let live = true
    api
      .getUser(initialId)
      .then((u) => live && setUser(u))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [initialId])

  const signInDemo = useCallback(async () => {
    writeString(KEY, DEMO_USER_ID)
    await load(DEMO_USER_ID)
  }, [load])

  const signOut = useCallback(() => {
    writeString(KEY, null)
    setSessionUserId(null)
    setUser(null)
  }, [])

  const refresh = useCallback(() => load(user?.id ?? null), [load, user?.id])

  const value = useMemo(() => ({ user, loading, signInDemo, signOut, refresh }), [user, loading, signInDemo, signOut, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
