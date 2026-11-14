import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter, matchRoutes, RouterProvider } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { InitialDataProvider, readEmbeddedData } from './lib/initialData'
import { routes } from './router'
// Fonts are served from this site, not Google, so visitors' browsers don't contact a third party.
import '@fontsource-variable/anek-latin/standard.css'
import '@fontsource/mukta/400.css'
import '@fontsource/mukta/500.css'
import '@fontsource/mukta/600.css'
import '@fontsource/mukta/700.css'
import './index.css'

async function preloadPage(pathname: string) {
  const matches = matchRoutes(routes, pathname) ?? []
  await Promise.all(
    matches.map((m) => {
      const type = (m.route.element as { type?: { preload?: () => Promise<void> } } | undefined)?.type
      return type?.preload?.()
    }),
  ).catch(() => {})
}

const router = createBrowserRouter(routes)
const app = (
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <InitialDataProvider data={readEmbeddedData()}>
          <RouterProvider router={router} />
        </InitialDataProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)

const root = document.getElementById('root')!
// Pages prerendered at build time arrive with their HTML already in place; take it over
// instead of drawing it again, but only if it was made for this exact address (a host
// falling back to another page's HTML must never be hydrated as this page).
const prerenderedFor = root.dataset.prerendered
const here = window.location.pathname.replace(/(.)\/+$/, '$1') // "/privacy/" and "/privacy" are the same page
if (root.hasChildNodes() && prerenderedFor === here) {
  // Load this page's code first, so the whole page is taken over in one pass.
  await preloadPage(here)
  hydrateRoot(root, app, {
    // React recovers by re-rendering; say so, so mismatches get noticed and fixed.
    onRecoverableError: (e) => console.warn('Hydration recovered:', e instanceof Error ? e.message : e),
  })
} else {
  root.replaceChildren()
  delete root.dataset.prerendered
  createRoot(root).render(app)
}
