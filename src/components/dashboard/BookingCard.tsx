import { MessageCircle } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Booking, Listing, UserProfile } from '@shared/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Feedback'
import { ListingImage } from '@/components/ui/ListingImage'
import { api, ApiError } from '@/lib'
import { dateRange, plural, rupees } from '@/lib/format'
import { ReviewForm } from './ReviewForm'

export type Role = 'owner' | 'renter'

interface Props {
  booking: Booking
  role: Role
  listing: Listing | null
  other: UserProfile | null
  reviewed: boolean
  /** Reload the dashboard and announce what happened. */
  onChanged: (message: string) => void
}

const STATUS: Record<Booking['status'], { owner: string; renter: string; tone: 'neutral' | 'accent' | 'success' | 'danger' }> = {
  requested: { owner: 'Waiting for your answer', renter: 'Waiting for the owner', tone: 'accent' },
  accepted: { owner: 'Booked', renter: 'Booked', tone: 'success' },
  active: { owner: 'With the renter', renter: 'With you', tone: 'success' },
  completed: { owner: 'Returned', renter: 'Returned', tone: 'neutral' },
  declined: { owner: 'Declined', renter: 'Declined', tone: 'neutral' },
  cancelled: { owner: 'Cancelled', renter: 'Cancelled', tone: 'neutral' },
}

type Action = { label: string; run: () => Promise<unknown>; done: string; variant?: 'primary' | 'outline' | 'danger'; confirm?: string }

export function BookingCard({ booking: b, role, listing, other, reviewed, onChanged }: Props) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Action | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const otherName = other?.name ?? (role === 'owner' ? 'the renter' : 'the owner')
  const title = listing?.title ?? 'An item that’s no longer listed'
  const q = b.quote

  const actions: Action[] = []
  if (role === 'owner' && b.status === 'requested') {
    actions.push({ label: 'Accept', run: () => api.respondToBooking(b.id, true), done: `Accepted. Those dates are now blocked for ${title}.` })
    actions.push({ label: 'Decline', variant: 'outline', run: () => api.respondToBooking(b.id, false), done: 'Request declined.' })
  }
  if (role === 'owner' && b.status === 'accepted') {
    actions.push({ label: 'Mark as handed over', run: () => api.markHandedOver(b.id), done: `Marked as handed over. Mark it as returned when ${otherName} brings it back.` })
  }
  if (role === 'owner' && b.status === 'active') {
    actions.push({ label: 'Mark as returned', run: () => api.markReturned(b.id), done: 'Marked as returned. The rental is complete.' })
  }
  if (b.status === 'accepted' || (role === 'renter' && b.status === 'requested')) {
    const isRequest = b.status === 'requested'
    actions.push({
      label: isRequest ? 'Cancel request' : 'Cancel booking',
      variant: 'danger',
      confirm: isRequest ? 'Cancel this request?' : `Cancel this booking? ${role === 'owner' ? `${otherName} will see it’s cancelled.` : 'The owner will see it’s cancelled.'} Nobody is charged.`,
      run: () => api.cancelBooking(b.id),
      done: isRequest ? 'Request cancelled.' : 'Booking cancelled. The dates are free again.',
    })
  }

  const run = async (a: Action) => {
    setBusy(a.label)
    setError(null)
    try {
      await a.run()
      setConfirming(null)
      onChanged(a.done)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That didn’t go through. Check your connection and try again.')
    } finally {
      setBusy(null)
    }
  }

  const message = async () => {
    const otherId = role === 'owner' ? b.renterId : b.ownerId
    setBusy('message')
    try {
      const c = await api.openConversation(b.listingId, otherId)
      navigate(`/messages/${c.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We couldn’t open the conversation. Please try again.')
      setBusy(null)
    }
  }

  const status = STATUS[b.status]
  const open = !['completed', 'declined', 'cancelled'].includes(b.status)

  return (
    <article aria-labelledby={`b-${b.id}`} className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-sunken sm:size-24">
          <ListingImage photo={listing?.photos[0]} decorative />
        </div>
        <div className="min-w-0 flex-1">
          <Badge tone={status.tone}>{status[role]}</Badge>
          <h3 id={`b-${b.id}`} className="mt-1.5 font-sans text-lg leading-snug font-semibold">
            {listing && listing.status === 'active' ? (
              <Link to={`/listing/${listing.id}`} className="hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="text-muted">
            {dateRange(b.start, b.end)}, {plural(q.days, 'day')}, {role === 'owner' ? `requested by ${otherName}` : `from ${otherName}`}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <Row term={role === 'owner' ? 'You get at pickup' : 'You pay at pickup'}>
          {rupees(role === 'owner' ? q.ownerPayout + q.refundableDeposit : q.totalDue)}
        </Row>
        <Row term="Of which deposit">{q.refundableDeposit ? `${rupees(q.refundableDeposit)}, given back on return` : 'None'}</Row>
        <Row term={b.delivery ? 'Delivery' : 'Pickup'}>{b.delivery ? `Owner delivers${q.deliveryFee ? ` (${rupees(q.deliveryFee)})` : ''}` : 'Renter collects'}</Row>
      </dl>

      {b.message && role === 'owner' && b.status === 'requested' && (
        <blockquote className="mt-3 rounded-xl bg-sunken px-4 py-3">
          <p className="text-[0.9375rem] font-semibold">{otherName} wrote:</p>
          <p className="mt-0.5">{b.message}</p>
        </blockquote>
      )}

      {error && (
        <p role="alert" className="mt-3 font-medium text-danger">
          {error}
        </p>
      )}

      {confirming ? (
        <div className="mt-4 rounded-xl border border-danger/50 p-4">
          <p ref={confirmRef} tabIndex={-1} className="font-semibold outline-none">
            {confirming.confirm}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => void run(confirming)} disabled={busy !== null}>
              {busy ? 'Cancelling…' : `Yes, ${confirming.label.toLowerCase()}`}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy !== null}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5">
          {actions.map((a) => (
            <Button
              key={a.label}
              size="sm"
              variant={a.variant ?? 'primary'}
              disabled={busy !== null}
              onClick={() => {
                if (a.confirm) {
                  setConfirming(a)
                  requestAnimationFrame(() => confirmRef.current?.focus())
                } else void run(a)
              }}
            >
              {busy === a.label ? 'Saving…' : a.label}
            </Button>
          ))}
          {b.status === 'completed' && !reviewed && !reviewing && (
            <Button size="sm" onClick={() => setReviewing(true)}>
              Review {role === 'owner' ? 'the renter' : 'this rental'}
            </Button>
          )}
          {b.status === 'completed' && reviewed && <p className="self-center text-[0.9375rem] text-muted">You’ve reviewed this rental.</p>}
          {(open || b.status === 'completed') && other && (
            <Button size="sm" variant="ghost" icon={<MessageCircle aria-hidden="true" className="size-4" />} disabled={busy !== null} onClick={() => void message()}>
              Message {other.name.split(' ')[0]}
            </Button>
          )}
        </div>
      )}

      {reviewing && (
        <ReviewForm
          bookingId={b.id}
          aboutName={otherName}
          asRenter={role === 'renter'}
          onCancel={() => setReviewing(false)}
          onDone={() => {
            setReviewing(false)
            onChanged('Thanks, your review is posted.')
          }}
        />
      )}
    </article>
  )
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 sm:block">
      <dt className="text-[0.9375rem] text-muted">{term}</dt>
      <dd className="font-semibold sm:font-medium">{children}</dd>
    </div>
  )
}
