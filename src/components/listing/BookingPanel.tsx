import { IdGate } from '@/components/account/IdGate'
import { useIdNeeded } from '@/hooks/useIdNeeded'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Truck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { bookingProblem } from '@shared/bookingRules'
import { addMonths, quoteListing, quoteListingMonths, rentalDays, rentsByDay, rentsByMonth } from '@shared/pricing'
import type { Booking, Listing, RentalTerm } from '@shared/types'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib'
import { dateRange, plural, rupees, todayIST } from '@/lib/format'
import { Button, ButtonLink } from '../ui/Button'
import { PriceTag } from '../ui/PriceTag'
import { useHydrated } from '@/lib/initialData'
import { AvailabilityCalendar, StartDateCalendar, type IsoRange } from './AvailabilityCalendar'
import { SelectField } from '../ui/Field'
import { TermSwitch } from '../ui/TermSwitch'
import { PriceBreakdown } from './PriceBreakdown'

interface Props {
  listing: Listing
  onBooked?: (b: Booking) => void
}

export function BookingPanel({ listing, onBooked }: Props) {
  const { user } = useAuth()
  const location = useLocation()
  const today = todayIST()
  const hydrated = useHydrated()
  const offersDelivery = listing.pickupOptions.includes('delivery')
  const offersPickup = listing.pickupOptions.includes('pickup')

  const byDay = rentsByDay(listing)
  const byMonth = rentsByMonth(listing)
  const [term, setTerm] = useState<RentalTerm>(byDay ? 'days' : 'months')
  const [range, setRange] = useState<IsoRange>({})
  const [start, setStart] = useState<string | undefined>()
  const [months, setMonths] = useState(listing.months?.min ?? 1)
  const [delivery, setDelivery] = useState(!offersPickup)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<Booking | null>(null)

  const monthly = term === 'months'
  const from = monthly ? start : range.from
  const to = monthly ? (start ? addMonths(start, months) : undefined) : range.to
  const complete = Boolean(from && to)
  const problem = complete ? bookingProblem(listing, { start: from!, end: to!, delivery, term, months }, user?.id ?? '', today) : null
  const quote = useMemo(
    () => (complete && !problem ? (monthly ? quoteListingMonths(listing, from!, months, delivery) : quoteListing(listing, from!, to!, delivery)) : null),
    [complete, problem, monthly, listing, from, to, months, delivery],
  )

  const status = monthly
    ? !start
      ? 'Choose the day you’d like it from.'
      : (problem ?? `${dateRange(from!, to!)}, ${plural(months, 'month')}.`)
    : !range.from
      ? 'Choose your pickup date.'
      : !range.to
        ? 'Now choose your return date.'
        : (problem ?? `${dateRange(range.from, range.to)}, ${plural(rentalDays(range.from, range.to), 'day')}.`)

  const isOwner = user?.id === listing.ownerId
  const idNeeded = useIdNeeded()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!quote || !from || !to) return
    setSubmitting(true)
    setError(null)
    try {
      const b = await api.requestBooking({ listingId: listing.id, start: from, end: to, delivery, message, ...(monthly ? { months } : {}) })
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
        <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="inline-block">
          <CircleCheck aria-hidden="true" className="size-9 text-success" />
        </motion.span>
        <h2 className="mt-3 text-2xl">Request sent</h2>
        <p className="mt-2">
          You’ve asked for {dateRange(booked.start, booked.end)}
          {booked.quote.months ? ` (${plural(booked.quote.months, 'month')})` : ''}. We’ll show the owner’s answer on your dashboard.
        </p>
        <p className="mt-3 font-semibold">Due at pickup if accepted: {rupees(booked.quote.dueAtPickup ?? booked.quote.totalDue)}</p>
        {booked.quote.months && booked.quote.months > 1 ? (
          <p className="mt-1 text-[0.9375rem] text-muted">Then {rupees(booked.quote.monthlyRate!)} at the start of each month.</p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink to="/dashboard?tab=rentals">See my rentals</ButtonLink>
          <Button variant="outline" onClick={() => { setBooked(null); setRange({}); setStart(undefined) }}>
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
        <PriceTag {...(monthly ? { amount: listing.pricing.monthly!, per: 'month' as const } : { amount: listing.pricing.daily!, per: 'day' as const })} />
      </div>

      {byDay && byMonth && (
        <TermSwitch className="mt-4" legend="Rent it" value={term} onChange={(t) => { setTerm(t); setError(null) }} />
      )}

      {!monthly && (listing.pricing.weekly || (listing.pricing.monthly && !byMonth)) && (
        <p className="mt-2 text-[0.9375rem] text-muted">
          {[listing.pricing.weekly && `${rupees(listing.pricing.weekly)} a week`, !byMonth && listing.pricing.monthly && `${rupees(listing.pricing.monthly)} a month`]
            .filter(Boolean)
            .join(', ')}
          . The cheapest rate is applied for you.
        </p>
      )}

      {monthly && (
        <SelectField
          className="mt-4"
          label="How many months?"
          value={String(months)}
          onChange={(e) => { setMonths(Number(e.target.value)); setError(null) }}
          hint={`Paid month by month. Either of you can end it early with a month’s notice.`}
        >
          {Array.from({ length: listing.months!.max - listing.months!.min + 1 }, (_, i) => listing.months!.min + i).map((n) => (
            <option key={n} value={n}>
              {plural(n, 'month')}
            </option>
          ))}
        </SelectField>
      )}

      <div className="mt-4 -mx-2 min-h-[22rem] overflow-x-auto">
        {/* Which days are past depends on today, so draw the calendar in the browser only. */}
        {!hydrated ? (
          <div aria-hidden="true" className="mx-2 h-[20rem] animate-pulse rounded-field bg-sunken" />
        ) : monthly ? (
          <StartDateCalendar blockedDates={listing.blockedDates} today={today} value={start} onChange={(d) => { setStart(d); setError(null) }} />
        ) : (
          <AvailabilityCalendar blockedDates={listing.blockedDates} today={today} value={range} onChange={(r) => { setRange(r); setError(null) }} />
        )}
      </div>

      <p id="booking-status" className={problem ? 'mt-3 font-medium text-danger' : 'mt-3 font-semibold'} aria-live="polite">
        {status}
      </p>
      <p className="text-[0.9375rem] text-muted">
        {monthly
          ? `Rented for ${listing.months!.min === listing.months!.max ? plural(listing.months!.min, 'month') : `${plural(listing.months!.min, 'month')} to ${plural(listing.months!.max, 'month')}`} at a time.`
          : `Rented for ${listing.minDays === listing.maxDays ? plural(listing.minDays, 'day') : `${plural(listing.minDays, 'day')} to ${plural(listing.maxDays, 'day')}`} at a time.`}
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

      {/* Slides open when dates are picked, so the price is noticed. */}
      <AnimatePresence initial={false}>
        {quote && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <PriceBreakdown quote={quote} start={from} className="mt-5 border-t border-line pt-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {isOwner ? (
        <p className="mt-5 rounded-field bg-sunken p-3">This is your listing. Renters will see this panel.</p>
      ) : user && idNeeded ? (
        <IdGate reason="rent" framed={false} className="mt-5 border-t border-line pt-5" />
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
