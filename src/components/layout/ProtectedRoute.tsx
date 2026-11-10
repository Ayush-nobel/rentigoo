import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { PageLoading } from './AppShell'

/**
 * Signed-out visitors go to /login, and people who haven't finished their
 * profile go to finish it. Both come back here afterwards.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)
  if (status === 'loading') return <PageLoading />
  if (status === 'signed-out') return <Navigate to={`/login?next=${next}`} replace />
  if (status === 'needs-profile') return <Navigate to={`/signup?step=profile&next=${next}`} replace />
  return <>{children}</>
}
