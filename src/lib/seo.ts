/**
 * Search and social metadata. One source for both the browser (Seo component)
 * and the build-time prerender (scripts/prerender.ts), so they never disagree.
 */
export interface PageMeta {
  title: string
  description: string
  /** Path for the canonical URL, e.g. "/privacy". Omit for pages that shouldn't have one. */
  path?: string
  /** Keep out of search results (private, unfinished or error pages). */
  noindex?: boolean
  /** Absolute or root-relative image for link previews. */
  image?: string
  /** Structured data (schema.org) objects. */
  jsonLd?: object[]
}

export const SITE_NAME = 'RentiGoo'
export const DEFAULT_IMAGE = '/brand/og-image.png'

/** Public site address, e.g. https://www.example.in. Set VITE_SITE_URL; never guess it. */
export const SITE_URL: string | null = (() => {
  const v = (import.meta.env?.VITE_SITE_URL as string | undefined)?.trim()
  return v ? v.replace(/\/+$/, '') : null
})()

export function absoluteUrl(path: string, base = SITE_URL): string | null {
  if (/^https?:\/\//.test(path)) return path
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : null
}

export function fullTitle(title: string): string {
  return title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Rent what you need, from people nearby in Bhopal`
}

/** Static pages: what search engines see for each. Listing pages are built from their data. */
export const STATIC_PAGES: Record<string, PageMeta> = {
  '/': {
    title: '',
    description: 'Rent cameras, tools, party gear, baby gear and more from people across Bhopal. Or earn from the things you already own. Free to join.',
    path: '/',
  },
  '/browse': {
    title: 'Things to rent in Bhopal',
    description: 'Search rentals across MP Nagar, Arera Colony, New Market, Shahpura, Kolar Road and Habibganj. Filter by area, price, dates and delivery.',
    path: '/browse',
  },
  '/faq': {
    title: 'Questions and answers',
    description: 'How renting and lending work on RentiGoo: requests, deposits, damage, fees, safety and your account.',
    path: '/faq',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'What personal data RentiGoo collects, why, who can see it, how long we keep it, and how to download or delete it.',
    path: '/privacy',
  },
  '/terms': {
    title: 'Terms and Conditions',
    description: 'The rules for renting and lending on RentiGoo, in plain language.',
    path: '/terms',
  },
  '/refunds': {
    title: 'Cancellation and Refund Policy',
    description: 'What happens to your money and deposit if plans change on RentiGoo.',
    path: '/refunds',
  },
  '/cookies': {
    title: 'Cookie and Storage Policy',
    description: 'RentiGoo uses no cookies and no tracking. Here is everything we store in your browser, and why.',
    path: '/cookies',
  },
  '/contact': {
    title: 'Contact and complaints',
    description: 'Who runs RentiGoo, how to reach us, and how to make a complaint to our grievance officer.',
    path: '/contact',
  },
  '/login': { title: 'Log in', description: 'Log in to RentiGoo.', path: '/login', noindex: true },
  '/signup': { title: 'Create your account', description: 'Join RentiGoo to rent from people nearby in Bhopal, or earn from your things.', path: '/signup' },
}

export const NOINDEX_PAGE = (title: string): PageMeta => ({ title, description: '', noindex: true })
