import { Seo } from '@/components/layout/Seo'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      {/* Single-page apps answer unknown addresses with "200 OK"; noindex stops them being treated as real pages. */}
      <Seo title="Page not found" description="" noindex />
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
