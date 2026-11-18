/**
 * Build-time renderer (not a server you run). scripts/prerender.mjs imports the
 * built version of this file to turn public pages into ready-to-read HTML.
 */
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { api } from './lib'
import { InitialDataProvider } from './lib/initialData'
import { HOME_LISTINGS } from './pages/homeData'
import { listingMeta } from './lib/listingMeta'
import { loadListingPage } from './lib/listingPage'
import { absoluteUrl, DEFAULT_IMAGE, fullTitle, SITE_NAME, SITE_URL, STATIC_PAGES, type PageMeta } from './lib/seo'
import { routes } from './router'

export { STATIC_PAGES, SITE_URL, listingMeta, loadListingPage }
export { HOME_LISTINGS } from './pages/homeData'
export { CATEGORIES } from '@shared/categories'

/**
 * Render one URL of the app to an HTML string (the contents of #root).
 * Every section must come out finished and in place; a "pending" section would
 * be thrown away and redrawn by the browser, wasting the prerender.
 */
export async function renderPage(url: string, data: Record<string, unknown> = {}): Promise<string> {
  const html = await renderOnce(url, data)
  if (html.includes('<!--$?-->') || html.includes('<!--$!-->')) throw new Error(`${url} has an unfinished section after prerendering`)
  return html
}

async function renderOnce(url: string, data: Record<string, unknown>): Promise<string> {
  const handler = createStaticHandler(routes)
  const context = await handler.query(new Request(`http://prerender.local${url}`))
  if (context instanceof Response) throw new Error(`Unexpected redirect while prerendering ${url}`)
  const router = createStaticRouter(handler.dataRoutes, context)
  // prerender (unlike renderToString) waits for lazy pages to load before returning.
  const { prelude } = await prerender(
    <StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <InitialDataProvider data={data}>
            <StaticRouterProvider router={router} context={context} hydrate={false} />
          </InitialDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </StrictMode>,
    // React normally "outlines" big finished sections (placeholder now, content later)
    // for progressive streaming. We're writing static files, so keep everything in place.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  )
  return new Response(prelude).text()
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The <head> tags for a page, matching what the Seo component sets in the browser. */
export function headTags(meta: PageMeta): string {
  const title = fullTitle(meta.title)
  const canonical = meta.path ? absoluteUrl(meta.path) : null
  const image = absoluteUrl(meta.image ?? DEFAULT_IMAGE) ?? meta.image ?? DEFAULT_IMAGE
  const tags = [
    `<title>${esc(title)}</title>`,
    meta.description && `<meta name="description" content="${esc(meta.description)}" />`,
    meta.noindex && `<meta name="robots" content="noindex, follow" />`,
    !meta.noindex && canonical && `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    meta.description && `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    canonical && `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    meta.jsonLd?.length &&
      `<script type="application/ld+json" data-seo>${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`,
  ]
  return tags.filter(Boolean).join('\n    ')
}

/** Every active listing, read with public (guest) access. */
/** The listings Home shows first: the same pick the page makes in the browser for someone not signed in. */
export async function homeListings() {
  const r = await api.searchListings({ sort: 'relevance' })
  return r.items.slice(0, HOME_LISTINGS)
}

export async function allListings() {
  const r = await api.searchListings({ page: 50, sort: 'newest' })
  return r.items
}
