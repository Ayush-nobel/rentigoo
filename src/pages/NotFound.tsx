import { useEffect } from 'react'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found · RentiGoo'
  }, [])
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="price-tag text-lg">404</p>
      <h1 className="mt-6 text-4xl sm:text-5xl">This page has been returned</h1>
      <p className="mt-4 text-lg text-muted">
        There’s nothing at this address. It may have moved, or the link had a typo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/browse">Browse rentals</ButtonLink>
        <ButtonLink to="/" variant="outline">
          Go to home
        </ButtonLink>
      </div>
    </section>
  )
}
