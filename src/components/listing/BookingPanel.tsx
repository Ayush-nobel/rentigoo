import { CircleCheck, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { bookingProblem } from '@shared/bookingRules'
import { quoteListing, rentalDays } from '@shared/pricing'
import type { Booking, Listing } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib'
import { dateRange, plural, rupees, todayIST } from '@/lib/format'
import { Button, ButtonLink } from '../ui/Button'
import { PriceTag } from '../ui/PriceTag'
import { AvailabilityCalendar, type IsoRange } from './AvailabilityCalendar'
import { PriceBreakdown } from './PriceBreakdown'

interface Props {
  listing: Listing
  onBooked?: (b: Booking) => void
}

export function BookingPanel({ listing, onBooked }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  const today = todayIST()
  const offersDelivery = listing.pickupOptions.includes('delivery')
  const offersPickup = listing.pickupOptions.includes('pickup')

  const [range, setRange] = useState<IsoRange>({})
  const [delivery, setDelivery] = useState(!offersPickup)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<Booking | null>(null)

  const complete = Boolean(range.from && range.to)
  const problem = complete ? bookingProblem(listing, { start: range.from!, end: range.to!, delivery }, user?.id ?? '', today) : null
  const quote = useMemo(
    () => (complete && !problem ? quoteListing(listing, range.from!, range.to!, delivery) : null),
    [complete, problem, listing, range.from, range.to, delivery],
  )

  const status = !range.from
    ? 'Choose your pickup date.'
    : !range.to
      ? 'Now choose your return date.'
      : problem ?? `${dateRange(range.from, range.to)}, ${plural(rentalDays(range.from, range.to), 'day')}.`

  const isOwner = user?.id === listing.ownerId

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!quote || !range.from || !range.to) return
    setSubmitting(true)
    setError(null)
    try {
      const b = await api.requestBooking({ listingId: listing.id, start: range.from, end: range.to, delivery, message })
      setBooked(b)
      onBooked?.(b)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong sending your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (booked) {
    return (
      <div className="rounded-[24px] border border-line bg-surface p-5 sm:p-6" role="status">
        <CircleCheck aria-hidden="true" className="size-9 text-success" />
        <h2 className="mt-3 text-2xl">Request sent</h2>
        <p className="mt-2">
          You’ve asked for {dateRange(booked.start, booked.end)}. We’ll show the owner’s answer on your dashboard.
        </p>
        <p className="mt-3 font-semibold">Due at pickup if accepted: {rupees(booked.quote.totalDue)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink to="/dashboard?tab=bookings">See my bookings</ButtonLink>
          <Button variant="outline" onClick={() => { setBooked(null); setRange({}) }}>
            Pick other dates
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="booking-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="booking-title" className="text-2xl">
          Check dates
        </h2>
        <PriceTag amount={listing.pricing.daily} />
      </div>
      {(listing.pricing.weekly || listing.pricing.monthly) && (
        <p className="mt-2 text-[0.9375rem] text-muted">
          {[listing.pricing.weekly && `${rupees(listing.pricing.weekly)} a week`, listing.pricing.monthly && `${rupees(listing.pricing.monthly)} a month`]
            .filter(Boolean)
            .join(', ')}
          . The cheapest rate is applied for you.
        </p>
      )}

      <div className="mt-4 -mx-2 overflow-x-auto">
        <AvailabilityCalendar blockedDates={listing.blockedDates} today={today} value={range} onChange={(r) => { setRange(r); setError(null) }} />
      </div>

      <p id="booking-status" className={problem ? 'mt-3 font-medium text-danger' : 'mt-3 font-semibold'} aria-live="polite">
        {status}
      </p>
      <p className="text-[0.9375rem] text-muted">
        Rented for {listing.minDays === listing.maxDays ? plural(listing.minDays, 'day') : `${plural(listing.minDays, 'day')} to ${plural(listing.maxDays, 'day')}`} at a time.
      </p>

      {offersDelivery && offersPickup && (
        <fieldset className="mt-5">
          <legend className="font-semibold">How do you want it?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { v: false, label: 'I’ll pick it up', sub: 'Free' },
              { v: true, label: 'Deliver it', sub: listing.deliveryFee ? rupees(listing.deliveryFee) : 'Free' },
            ].map((o) => (
              <label
                key={String(o.v)}
                className="flex min-h-14 cursor-pointer flex-col justify-center rounded-field border border-line-strong px-3 py-2 has-checked:border-text has-checked:bg-sunken has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
              >
                <input type="radio" name="delivery" className="sr-only" checked={delivery === o.v} onChange={() => setDelivery(o.v)} />
                <span className="font-semibold">{o.label}</span>
                <span className="text-[0.9375rem] text-muted">{o.sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {offersDelivery && !offersPickup && (
        <p className="mt-4 flex items-center gap-2">
          <Truck aria-hidden="true" className="size-5" /> Delivery only{listing.deliveryFee ? `, ${rupees(listing.deliveryFee)}` : ''}.
        </p>
      )}

      {quote && <PriceBreakdown quote={quote} className="mt-5 border-t border-line pt-4" />}

      {isOwner ? (
        <p className="mt-5 rounded-field bg-sunken p-3">This is your listing. Renters will see this panel.</p>
      ) : user ? (
        <>
          <label className="mt-5 block">
            <span className="font-semibold">Message to the owner</span>
            <span className="mt-0.5 block text-[0.9375rem] text-muted">Optional. Say what it’s for and when you’d like to pick it up.</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              rows={3}
              className="mt-2 w-full rounded-field border border-line-strong bg-surface p-3 hover:border-text focus-visible:border-text"
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 font-medium text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!quote || submitting}>
            {submitting ? 'Sending…' : 'Request to book'}
          </Button>
          <p className="mt-2 text-center text-[0.9375rem] text-muted">You won’t pay anything until the owner accepts.</p>
        </>
      ) : (
        <div className="mt-5">
          <ButtonLink to={`/login?next=${encodeURIComponent(location.pathname)}`} size="lg" className="w-full">
            Log in to request
          </ButtonLink>
          <p className="mt-2 text-center text-[0.9375rem] text-muted">
            New here? <Link to={`/signup?next=${encodeURIComponent(location.pathname)}`} className="font-semibold text-accent-text underline underline-offset-4">Sign up free</Link>
          </p>
        </div>
      )}
    </form>
  )
}
