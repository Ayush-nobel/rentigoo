/**
 * Serves dist/ the way Amplify Hosting will: real files first, then the rules
 * in amplify-rewrites.json, in order. Lets us test the exact routing we deploy.
 *   node scripts/serve-dist.mjs [port]
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { createGzip } from 'node:zlib'
import { extname, join, normalize } from 'node:path'

const port = Number(process.argv[2] ?? 4173)
const DIST = join(process.cwd(), 'dist')
const rules = JSON.parse(readFileSync('amplify-rewrites.json', 'utf8'))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' }

function fileFor(pathname) {
  const p = normalize(join(DIST, decodeURIComponent(pathname)))
  return p.startsWith(DIST) && existsSync(p) && statSync(p).isFile() ? p : null
}
function matches(source, pathname) {
  if (source.startsWith('</') && source.endsWith('/>')) return new RegExp(source.slice(2, -2)).test(pathname)
  if (source.endsWith('<*>')) return pathname.startsWith(source.slice(0, -3))
  return source === pathname
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x')
  // Like Amplify: the exact file, else <path>.html (clean URLs), else the rules.
  let file = pathname === '/' ? join(DIST, 'index.html') : (fileFor(pathname) ?? fileFor(`${pathname.replace(/\/$/, '')}.html`))
  if (!file) {
    const rule = rules.find((r) => matches(r.source, pathname))
    file = rule ? fileFor(rule.target) : null
  }
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    return createReadStream(join(DIST, '404.html')).pipe(res)
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream'
  // Compress text like Amplify's CDN does, so local measurements are realistic.
  const gzip = /text|javascript|json|xml|svg|manifest/.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache', ...(gzip ? { 'content-encoding': 'gzip', vary: 'accept-encoding' } : {}) })
  if (gzip) createReadStream(file).pipe(createGzip()).pipe(res)
  else createReadStream(file).pipe(res)
}).listen(port, () => console.log(`Serving dist/ with Amplify rules on http://localhost:${port}`))
