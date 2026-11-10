import { MotionConfig } from 'framer-motion'
import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { DemoBanner } from './DemoBanner'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

export function AppShell() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-accent px-5 py-3 font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <DemoBanner />
      <Header />
      <main id="main" tabIndex={-1} className="min-h-[60vh] outline-none">
        <RouteFocus />
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileNav />
      <ScrollRestoration />
    </MotionConfig>
  )
}

/** Move focus to the page on navigation so screen readers announce the new page. */
function RouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

export function PageLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6" role="status">
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-64 animate-pulse rounded-field bg-sunken" />
      <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded-field bg-sunken" />
    </div>
  )
}
