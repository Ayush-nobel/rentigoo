import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { cx } from '@/lib/cx'
import { whatsappUrl } from '@/config/business'

/** Pages where it shows: browsing and help. Not on forms, messages or listings (the booking bar sits there on phones). */
const SHOW_ON = ['/', '/browse', '/how-it-works', '/trust-and-safety', '/faq', '/about', '/contact', '/rent-or-buy', '/earn']

/** Floating "WhatsApp us" button: above the tab bar on phones, bottom right on wider screens. */
export function WhatsAppButton() {
  const { pathname } = useLocation()
  const url = whatsappUrl()
  // On phones it waits until you've scrolled a little, so it never covers the search box on first view.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > window.innerHeight * 0.6)
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [pathname])
  if (!url || !SHOW_ON.includes(pathname)) return null
  return (
    <a
      href={url}
      rel="noopener noreferrer"
      className={cx(
        'fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 min-h-12 items-center gap-2 rounded-full bg-ink px-4 font-semibold text-on-ink shadow-[var(--shadow)] hover:opacity-90 md:right-6 md:bottom-6 md:inline-flex',
        scrolled ? 'inline-flex' : 'hidden',
      )}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      WhatsApp us
    </a>
  )
}
