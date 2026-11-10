import { useEffect } from 'react'
import { absoluteUrl, DEFAULT_IMAGE, fullTitle, SITE_NAME, type PageMeta } from '@/lib/seo'

/**
 * Keeps <head> in step with the page as people move around the app.
 * Updates tags in place (never duplicates), so it works with the prerendered
 * HTML that already carries the same tags.
 */
export function Seo(meta: PageMeta) {
  const { title, description, path, noindex, image = DEFAULT_IMAGE, jsonLd } = meta
  const ld = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    const t = fullTitle(title)
    document.title = t
    const canonical = path ? absoluteUrl(path) : null
    const img = absoluteUrl(image) ?? image
    setMeta('name', 'description', description || null)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : null)
    setMeta('property', 'og:title', t)
    setMeta('property', 'og:description', description || null)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', img)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setLink('canonical', noindex ? null : canonical)
    setJsonLd(ld)
  }, [title, description, path, noindex, image, ld])
  return null
}

function setMeta(attr: 'name' | 'property', key: string, value: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (value === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

function setLink(rel: string, href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

function setJsonLd(json: string) {
  let el = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-seo]')
  if (!json) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.seo = ''
    document.head.appendChild(el)
  }
  el.textContent = json
}
