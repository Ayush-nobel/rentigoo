import { Star } from 'lucide-react'
import { useState } from 'react'
import type { Review, UserProfile } from '@shared/types'
import { relativeTime } from '@/lib/format'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'

interface Props {
  reviews: Review[]
  authors: Map<string, UserProfile>
  ratingAvg: number
}

const INITIAL = 4

export function Reviews({ reviews, authors, ratingAvg }: Props) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? reviews : reviews.slice(0, INITIAL)

  return (
    <section aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="flex flex-wrap items-center gap-x-3 text-3xl">
        {reviews.length === 0 ? (
          'No reviews yet'
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <Star aria-hidden="true" className="size-7 fill-current" />
              {ratingAvg.toFixed(1)}
            </span>
            <span>
              from {reviews.length} {reviews.length === 1 ? 'renter' : 'renters'}
            </span>
          </>
        )}
      </h2>
      {reviews.length === 0 ? (
        <p className="mt-2 text-muted">Be the first to rent this and tell others how it went.</p>
      ) : (
        <>
          <Distribution reviews={reviews} />
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {shown.map((r) => {
              const author = authors.get(r.authorId)
              const name = author?.name.split(' ')[0] ?? 'A renter'
              return (
                <li key={r.id}>
                  <div className="flex items-center gap-3">
                    <Avatar name={author?.name ?? 'Renter'} src={author?.avatarKey} size="md" />
                    <div>
                      <p className="font-semibold">{name}</p>
                      {/* "3 days ago" differs between build time and visit time; that's expected. */}
                      <p className="text-[0.9375rem] text-muted" suppressHydrationWarning>
                        {relativeTime(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} aria-hidden="true" className={i < r.rating ? 'size-4 fill-current' : 'size-4 text-line-strong'} />
                    ))}
                  </p>
                  <p className="mt-1.5">{r.text}</p>
                </li>
              )
            })}
          </ul>
          {reviews.length > INITIAL && (
            <Button variant="outline" className="mt-6" onClick={() => setShowAll((s) => !s)} aria-expanded={showAll}>
              {showAll ? 'Show fewer reviews' : `Show all ${reviews.length} reviews`}
            </Button>
          )}
        </>
      )}
    </section>
  )
}

/** How many reviews gave each star rating: bars with the count written out. */
function Distribution({ reviews }: { reviews: Review[] }) {
  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, n: reviews.filter((r) => r.rating === stars).length }))
  const max = Math.max(...counts.map((c) => c.n), 1)
  return (
    <ul className="mt-4 max-w-sm space-y-1.5" aria-label="Ratings breakdown">
      {counts.map(({ stars, n }) => (
        <li key={stars} className="grid grid-cols-[3.5rem_1fr_1.5rem] items-center gap-3 text-[0.9375rem]">
          <span>
            {stars} star{stars === 1 ? '' : 's'}
          </span>
          <span aria-hidden="true" className="h-2 rounded-[4px] bg-sunken">
            <span className="block h-full rounded-[4px] bg-ink" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}
