import { useEffect } from 'react'
import { ButtonLink } from '@/components/ui/Button'

/** Stand-in for pages that haven't been built yet. Removed once every page exists. */
export function ComingSoon({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · RentiGoo`
  }, [title])
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">We’re still building this page. Everything else will join it soon.</p>
      <ButtonLink to="/" variant="outline" className="mt-8">
        Back to home
      </ButtonLink>
    </section>
  )
}
