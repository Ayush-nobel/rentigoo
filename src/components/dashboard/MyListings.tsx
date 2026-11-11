import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { areaName } from '@shared/areas'
import type { Listing } from '@shared/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, EmptyState } from '@/components/ui/Feedback'
import { ListingImage } from '@/components/ui/ListingImage'
import { Rating } from '@/components/ui/Rating'
import { api, ApiError } from '@/lib'
import { rupees } from '@/lib/format'

const STATUS = {
  active: { label: 'Live', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
  draft: { label: 'Draft', tone: 'accent' },
} as const

export function MyListings({ listings, onChanged }: { listings: Listing[]; onChanged: (message: string) => void }) {
  if (!listings.length) {
    return (
      <EmptyState title="Nothing listed yet" action={<ButtonLink to="/list">List an item</ButtonLink>}>
        Got something you use only now and then? List it in a few minutes and earn from it.
      </EmptyState>
    )
  }
  return (
    <div>
      <ul className="space-y-4">
        {listings.map((l) => (
          <li key={l.id}>
            <ListingRow listing={l} onChanged={onChanged} />
          </li>
        ))}
      </ul>
      <ButtonLink to="/list" variant="outline" className="mt-6" icon={<Plus aria-hidden="true" className="size-4" />}>
        List another item
      </ButtonLink>
    </div>
  )
}

function ListingRow({ listing: l, onChanged }: { listing: Listing; onChanged: (message: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const s = STATUS[l.status]

  const act = async (name: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(name)
    setError(null)
    try {
      await fn()
      setBusy(null)
      onChanged(done)
      return true
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That didn’t go through. Check your connection and try again.')
      setBusy(null)
      return false
    }
  }

  return (
    <article aria-labelledby={`l-${l.id}`} className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sunken sm:size-24">
          <ListingImage photo={l.photos[0]} decorative />
        </div>
        <div className="min-w-0 flex-1">
          <Badge tone={s.tone}>{s.label}</Badge>
          <h3 id={`l-${l.id}`} className="mt-1.5 font-sans text-lg leading-snug font-semibold">
            {l.status === 'active' ? (
              <Link to={`/listing/${l.id}`} className="hover:underline">
                {l.title}
              </Link>
            ) : (
              l.title
            )}
          </h3>
          <p className="text-muted">
            {l.pricing.daily ? `${rupees(l.pricing.daily)} a day` : 'No price yet'}, {areaName(l.areaId)}
          </p>
          {l.status !== 'draft' && <Rating value={l.ratingAvg} count={l.ratingCount} className="mt-1" />}
        </div>
      </div>
      {l.status === 'paused' && <p className="mt-3 text-[0.9375rem] text-muted">Hidden from renters. Bookings you’ve already accepted still go ahead.</p>}
      {l.status === 'draft' && (
        <p className="mt-3 text-[0.9375rem] text-muted">Only you can see this. Finish it to publish.{l.photos.length ? '' : ' It still needs photos.'}</p>
      )}

      {error && (
        <p role="alert" className="mt-3 font-medium text-danger">
          {error}
        </p>
      )}

      {confirmDelete ? (
        <div className="mt-4 rounded-xl border border-danger/50 p-4">
          <p ref={confirmRef} tabIndex={-1} className="font-semibold outline-none">
            Delete “{l.title}” for good? Its photos are deleted too, and any open requests are declined.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={busy !== null}
              onClick={() =>
                void act('delete', () => api.deleteListing(l.id), `Deleted “${l.title}”.`).then((ok) => ok || setConfirmDelete(false))
              }
            >
              {busy === 'delete' ? 'Deleting…' : 'Yes, delete it'}
            </Button>
            <Button variant="ghost" disabled={busy !== null} onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5">
          <ButtonLink size="sm" variant={l.status === 'draft' ? 'primary' : 'outline'} to={`/list?edit=${l.id}`}>
            {l.status === 'draft' ? 'Finish listing' : 'Edit'}
            <span className="sr-only"> {l.title}</span>
          </ButtonLink>
          {l.status === 'active' && (
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void act('pause', () => api.updateListing(l.id, { status: 'paused' }), `Paused “${l.title}”. Renters can’t see it now.`)}>
              {busy === 'pause' ? 'Pausing…' : 'Pause'}
              <span className="sr-only"> {l.title}</span>
            </Button>
          )}
          {l.status === 'paused' && (
            <Button size="sm" disabled={busy !== null} onClick={() => void act('resume', () => api.updateListing(l.id, { status: 'active' }), `“${l.title}” is live again.`)}>
              {busy === 'resume' ? 'Switching on…' : 'Show to renters again'}
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            disabled={busy !== null}
            onClick={() => {
              setConfirmDelete(true)
              requestAnimationFrame(() => confirmRef.current?.focus())
            }}
          >
            Delete
            <span className="sr-only"> {l.title}</span>
          </Button>
        </div>
      )}
    </article>
  )
}
