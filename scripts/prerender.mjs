/**
 * After `vite build` (browser) and `vite build --ssr` (renderer):
 *  - writes ready-to-read HTML for public pages and every active listing,
 *    each with its own title, description, canonical and preview tags
 *  - writes sitemap.xml and robots.txt
 *  - writes amplify-rewrites.json (the routing rules Amplify Hosting needs)
 * Private pages (account, dashboard, messages, list) are never prerendered.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

const DIST = 'dist'
const ssr = await import(pathToFileURL(join(process.cwd(), 'dist-ssr/entry-server.js')).href)
const { renderPage, headTags, STATIC_PAGES, SITE_URL, listingMeta, allListings, homeListings, categoryListings, categoryPageMeta, CATEGORIES, loadListingPage } = ssr

const shell = readFileSync(join(DIST, 'index.html'), 'utf8')
if (!shell.includes('<div id="root"></div>')) throw new Error('index.html is missing <div id="root"></div>')

// Fetch the fonts used by headings and body text straight away, so text doesn't
// re-render late in a different font (that late swap was the "largest paint").
const css = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('')
const fontUrl = (name) => css.match(new RegExp(`/assets/${name}-[\\w-]+\\.woff2`))?.[0]
const preloads = ['anek-latin-latin-standard-normal', 'mukta-latin-400-normal']
  .map(fontUrl)
  .filter(Boolean)
  .map((u) => `<link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin />`)
  .join('\n    ')
const template = shell
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta name="description"[^>]*>\s*/, '')
  .replace('<link rel="manifest"', `${preloads}\n    <link rel="manifest"`)

function page(head, body, path, data) {
  // Data the page was rendered with, so the browser starts from exactly the same state.
  const embedded = data ? `\n    <script type="application/json" id="__INITIAL_DATA__">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>` : ''
  return template
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root" data-prerendered="${path}">${body}</div>${embedded}`)
}

// The empty app shell: served for every address that isn't prerendered (private
// pages, listings added since the last build). Never the Home page's HTML.
writeFileSync(join(DIST, 'app.html'), shell.replace('<link rel="manifest"', `${preloads}\n    <link rel="manifest"`))
// Flat files (/privacy -> privacy.html): Amplify serves those at the clean address with no
// redirect. Folders (privacy/index.html) would make it 301 to /privacy/ first.
function write(path, html) {
  const file = path === '/' ? join(DIST, 'index.html') : join(DIST, `${path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

const written = []
const t0 = Date.now()

// 1. Public static pages. Home is built with its listings in the HTML, so they show before any script runs.
let home = null
try {
  home = { 'home:listings': await homeListings() }
} catch (e) {
  console.warn(`Couldn’t load listings for Home (${e.message}). They will load in the browser.`)
}
for (const [path, meta] of Object.entries(STATIC_PAGES)) {
  const data = path === '/' ? home : null
  write(path, page(headTags(meta), await renderPage(path, data ?? {}), path, data))
  written.push(path)
}

// 1b. One page per category (/rent/cameras …), built with its listings: what people search for.
for (const c of CATEGORIES) {
  const path = `/rent/${c.id}`
  let data = null
  try {
    data = { [`category:${c.id}`]: await categoryListings(c.id) }
  } catch (e) {
    console.warn(`Couldn’t load ${c.id} listings (${e.message}). That page will load them in the browser.`)
  }
  write(path, page(headTags(categoryPageMeta(c.id)), await renderPage(path, data ?? {}), path, data))
  written.push(path)
}

// 2. Every active listing, fully rendered with its owner, reviews and related items.
let listings = []
try {
  listings = await allListings()
} catch (e) {
  console.warn(`Couldn’t load listings for prerendering (${e.message}). Listing pages will render in the browser.`)
}
for (const l of listings) {
  const path = `/listing/${l.id}`
  const pageData = await loadListingPage(l.id)
  if (!pageData) continue
  const data = { [`listing:${l.id}`]: pageData }
  write(path, page(headTags(listingMeta(l)), await renderPage(path, data), path, data))
  written.push(path)
}

// 3. A noindex page for unknown addresses (hosting can serve it with a real 404 status).
writeFileSync(join(DIST, '404.html'), page(headTags({ title: 'Page not found', description: '', noindex: true }), await renderPage('/this-page-does-not-exist'), '*'))

// 4. robots.txt and sitemap.xml
// Robots rules match by prefix, so "/list" alone would also block every /listing/… page.
// "$" anchors the end (supported by Google and Bing): only /list itself is blocked.
const PRIVATE = ['/account', '/dashboard', '/messages', '/list$', '/list?']
const robots = ['User-agent: *', 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`)]
if (SITE_URL) {
  const urls = [
    ...Object.entries(STATIC_PAGES).filter(([, m]) => !m.noindex).map(([p]) => ({ loc: `${SITE_URL}${p === '/' ? '/' : p}` })),
    ...CATEGORIES.map((c) => ({ loc: `${SITE_URL}/rent/${c.id}` })),
    ...listings.map((l) => ({ loc: `${SITE_URL}/listing/${l.id}`, lastmod: l.createdAt.slice(0, 10) })),
  ]
  const xmlEsc = (s) => s.replace(/&/g, '&amp;')
  writeFileSync(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n') +
      `\n</urlset>\n`,
  )
  robots.push('', `Sitemap: ${SITE_URL}/sitemap.xml`)
  console.log(`sitemap.xml: ${urls.length} URLs`)
} else {
  console.warn('VITE_SITE_URL is not set: skipped sitemap.xml and canonical URLs. Set it to the live address before launch.')
}
writeFileSync(join(DIST, 'robots.txt'), robots.join('\n') + '\n')

// 5. App pages that are never prerendered (private) get a copy of the empty app shell as a
// real file, so Amplify serves /account straight from account.html (no /account/ redirect).
const APP_ROUTES = ['/account', '/dashboard', '/list', '/messages']
const appShell = readFileSync(join(DIST, 'app.html'), 'utf8')
for (const r of APP_ROUTES) writeFileSync(join(DIST, `${r}.html`), appShell)

// 6. Routing rules for Amplify Hosting (rules run before files, first match wins):
//  - /messages/<id> has no files under it, so it can always be the app shell (200)
//  - anything else without a file falls back to the app shell (Amplify answers 404)
const rewrites = [
  { source: '/messages/<*>', target: '/app.html', status: '200' },
  { source: '/<*>', target: '/app.html', status: '404-200' },
]
writeFileSync('amplify-rewrites.json', JSON.stringify(rewrites, null, 2) + '\n')

console.log(`Prerendered ${written.length} pages (${Object.keys(STATIC_PAGES).length} static, ${listings.length} listings) in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

// 6. Every inline script in the built pages must be allowed by the Content-Security-Policy
//    in customHttp.yml (by its hash), or browsers would refuse to run it on the live site.
const allowed = new Set(readFileSync('customHttp.yml', 'utf8').match(/'sha256-[A-Za-z0-9+/=]+'/g)?.map((h) => h.slice(1, -1)) ?? [])
const htmlFiles = readdirSync(DIST, { recursive: true }).filter((f) => String(f).endsWith('.html'))
const blocked = new Set()
for (const f of htmlFiles) {
  for (const [, body] of readFileSync(join(DIST, String(f)), 'utf8').matchAll(/<script(?![^>]*(?:\bsrc=|\btype="application\/(?:ld\+)?json"))[^>]*>([\s\S]*?)<\/script>/g)) {
    const hash = `sha256-${createHash('sha256').update(body).digest('base64')}`
    if (!allowed.has(hash)) blocked.add(hash)
  }
}
if (blocked.size) throw new Error(`Inline scripts not allowed by customHttp.yml's Content-Security-Policy. Add to script-src: ${[...blocked].map((h) => `'${h}'`).join(' ')}`)
console.log(`Content-Security-Policy allows every inline script in ${htmlFiles.length} pages`)

