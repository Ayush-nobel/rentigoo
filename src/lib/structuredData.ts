import { LAUNCH_CITY } from '@shared/areas'
import type { FaqItem } from '@shared/types'
import { BUSINESS } from '@/config/business'
import { absoluteUrl, SITE_NAME, SITE_URL } from './seo'

/** schema.org objects. Only facts we can stand behind; nothing invented. */

export function organization(): object | null {
  if (!SITE_URL) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    ...(BUSINESS.legalName ? { legalName: BUSINESS.legalName } : {}),
    url: SITE_URL,
    logo: absoluteUrl('/brand/icon-512.png'),
    areaServed: { '@type': 'City', name: LAUNCH_CITY },
    ...(BUSINESS.supportEmail ? { email: BUSINESS.supportEmail } : {}),
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
