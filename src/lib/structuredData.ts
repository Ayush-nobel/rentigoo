import { LAUNCH_CITY } from '@shared/areas'
import type { FaqItem } from '@shared/types'
import { BUSINESS } from '@/config/business'
import { absoluteUrl, SITE_NAME, SITE_URL } from './seo'

/** schema.org objects. Only facts we can stand behind; nothing invented. */

export function organization(): object | null {
  if (!SITE_URL) return null
  return {
    '@context': 'https://schema.org',
    // A local business in Bhopal (and an organisation), so local searches can show it.
    '@type': ['Organization', 'LocalBusiness'],
    name: SITE_NAME,
    ...(BUSINESS.legalName ? { legalName: BUSINESS.legalName } : {}),
    url: SITE_URL,
    logo: absoluteUrl('/brand/icon-512.png'),
    areaServed: { '@type': 'City', name: LAUNCH_CITY },
    ...(BUSINESS.supportEmail ? { email: BUSINESS.supportEmail } : {}),
    ...(BUSINESS.supportPhone ? { telephone: BUSINESS.supportPhone.replace(/\s/g, '') } : {}),
    image: absoluteUrl('/brand/icon-512.png'),
    description: 'Peer-to-peer rentals in Bhopal: rent cameras, party speakers, camping gear, tools and furniture from people nearby.',
    ...(BUSINESS.address ? { address: { '@type': 'PostalAddress', streetAddress: BUSINESS.address, addressLocality: LAUNCH_CITY, addressRegion: 'Madhya Pradesh', addressCountry: 'IN' } } : {}),
  }
}

export function website(): object | null {
  if (!SITE_URL) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/browse?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbs(items: { name: string; path: string }[]): object | null {
  if (!SITE_URL) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  }
}

export function faqPage(faqs: FaqItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

export const present = (xs: (object | null)[]): object[] => xs.filter((x): x is object => x !== null)
