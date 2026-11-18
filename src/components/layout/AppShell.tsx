import { motion, MotionConfig } from 'framer-motion'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { DemoBanner } from './DemoBanner'
import { Footer } from './Footer'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { WhatsAppButton } from './WhatsAppButton'

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
      <main id="main" tabIndex={-1} className="min-h-[100dvh] outline-none">
        <RouteFocus />
        <Suspense fallback={<PageLoading />}>
          <PageFade>
            <Outlet />
          </PageFade>
        </Suspense>
      </main>
      <Footer />
      <WhatsAppButton />
      <MobileNav />
      <ScrollRestoration />
    </MotionConfig>
  )
}

/**
 * A quick fade when moving between pages. Never on the first page shown, so
 * prerendered HTML appears instantly (and server and browser render the same).
 * Opacity only: a transform here would break the fixed booking bar on phones.
 */
function PageFade({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [firstPath] = useState(pathname)
  const isFirst = pathname === firstPath
  return (
    <motion.div key={pathname} initial={isFirst ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
      {children}
    </motion.div>
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
