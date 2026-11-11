import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FEES } from '@shared/fees'
import type { Booking, Listing, UserProfile } from '@shared/types'
import { Seo } from '@/components/layout/Seo'
import { BookingCard, type Role } from '@/components/dashboard/BookingCard'
import { MyListings } from '@/components/dashboard/MyListings'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/lib'
import { rupees } from '@/lib/format'
import { cx } from '@/lib/cx'

type Tab = 'requests' | 'rentals' | 'listings'
const TABS: { id: Tab; name: string }[] = [
  { id: 'requests', name: 'Requests for your items' },
  { id: 'rentals', name: 'Things you’re renting' },
  { id: 'listings', name: 'Your listings' },
]

async function load(userId: string) {
  const [asRenter, asOwner, listings, stats, myReviews] = await Promise.all([
    api.listMyBookings(),
    api.listRequestsForMe(),
    api.listListingsByOwner(userId),
    api.getOwnerStats(),
    api.listReviewsByAuthor(userId),
  ])
  const all = [...asRenter, ...asOwner]
  const own = new Map(listings.map((l) => [l.id, l]))
  const otherIds = [...new Set(all.map((b) => b.listingId).filter((id) => !own.has(id)))]
  const others = await Promise.all(otherIds.map((id) => api.getListing(id).catch(() => null)))
  const listingById = new Map<string, Listing>([...own, ...others.filter((l): l is Listing => l !== null).map((l) => [l.id, l] as const)])
  const people = await api.getUsers([...new Set(all.map((b) => (b.ownerId === userId ? b.renterId : b.ownerId)))])
  return {
    asRenter,
    asOwner,
    listings,
    stats,
    reviewedBookings: new Set(myReviews.map((r) => r.bookingId)),
    listingById,
    peopleById: new Map<string, UserProfile>(people.map((p) => [p.id, p])),
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tick, setTick] = useState(0)
  const [notice, setNotice] = useState('')
  const noticeRef = useRef<HTMLParagraphElement>(null)
  const data = useAsync(() => load(user!.id), [user?.id, tick])

  if (!user) return null
  const d = data.data
  const requested = TABS.find((t) => t.id === params.get('tab'))?.id
  // With nothing chosen: requests if you own things, otherwise what you're renting.
  const tab: Tab = requested ?? (d && !d.listings.length && !d.asOwner.length ? 'rentals' : 'requests')
  const counts: Record<Tab, number | null> = {
    requests: d ? d.asOwner.filter((b) => b.status === 'requested').length : null,
    rentals: d ? d.asRenter.filter((b) => ['requested', 'accepted', 'active'].includes(b.status)).length : null,
    listings: d ? d.listings.length : null,
  }

  const changed = (message: string) => {
    setNotice(message)
    setTick((t) => t + 1)
    // The button that was pressed may be gone now (the card moved or vanished), so keep focus on the news.
    requestAnimationFrame(() => noticeRef.current?.focus())
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
      <Seo title="Your dashboard" description="" noindex />
      <h1 className="text-4xl sm:text-5xl">Your dashboard</h1>
      <p className="mt-2 text-lg text-muted">Hi {user.name.split(' ')[0]}. Requests, rentals and your listings, all in one place.</p>

      {d && (d.listings.length > 0 || d.asOwner.length > 0) && <Stats stats={d.stats} />}

      <nav aria-label="Dashboard sections" className="mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2 border-b border-line">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                to={`?tab=${t.id}`}
                replace
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setNotice('')}
                className={cx(
                  '-mb-px flex min-h-12 items-center gap-2 rounded-t border-b-[3px] px-3 font-semibold',
                  tab === t.id ? 'border-ink text-text' : 'border-transparent text-muted hover:text-text',
                )}
              >
                {t.name}
                {counts[t.id] ? (
                  <span className="rounded-full bg-accent px-2 text-sm text-on-accent">
                    {counts[t.id]}
                    <span className="sr-only">{t.id === 'listings' ? ' listings' : ' open'}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p ref={noticeRef} tabIndex={-1} role="status" className={cx('font-medium outline-none', notice && 'mt-5 rounded-xl bg-success/12 px-4 py-3 text-success')}>
        {notice}
      </p>

      <div className="mt-6">
        {data.status === 'loading' && !d && (
          <div className="space-y-4" aria-label="Loading">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        )}
        {data.status === 'error' && (
          <EmptyState title="Your dashboard didn’t load" action={<button type="button" className="font-semibold underline underline-offset-4" onClick={() => setTick((t) => t + 1)}>Try again</button>}>
            Check your connection and try again.
          </EmptyState>
        )}
        {d && tab === 'listings' && <MyListings listings={d.listings} onChanged={changed} />}
        {d && tab !== 'listings' && (
          <Bookings
            role={tab === 'requests' ? 'owner' : 'renter'}
            bookings={tab === 'requests' ? d.asOwner : d.asRenter}
            data={d}
            onChanged={changed}
            onTab={(t) => setParams({ tab: t }, { replace: true })}
          />
        )}
      </div>
    </div>
  )
}

function Stats({ stats }: { stats: Awaited<ReturnType<typeof api.getOwnerStats>> }) {
  return (
    <section aria-labelledby="stats-title" className="mt-8 rounded-[24px] bg-ink p-5 text-on-ink sm:p-6">
      <h2 id="stats-title" className="font-sans text-lg font-semibold">
        Rent from your items
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Stat term="This month" value={rupees(stats.earnedThisMonth)} big />
        <Stat term="All time" value={rupees(stats.earnedTotal)} big />
        <Stat term="Coming up" value={String(stats.upcomingRentals)} />
        <Stat term="Out now" value={String(stats.activeRentals)} />
      </dl>
      <p className="mt-4 text-[0.9375rem] opacity-85">
        Counted when you mark an item as returned, or a month’s rent as paid. Renters pay you directly
        {FEES.ownerCommissionPct === 0 ? ', and RentiGoo takes no cut.' : `; this is after RentiGoo’s ${FEES.ownerCommissionPct}% fee.`}
      </p>
    </section>
  )
}

function Stat({ term, value, big }: { term: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className="text-[0.9375rem] opacity-85">{term}</dt>
      <dd className={cx('font-display font-bold', big ? 'text-3xl' : 'text-2xl')}>{value}</dd>
    </div>
  )
}

type Data = Awaited<ReturnType<typeof load>>

const GROUPS: { id: string; owner: string; renter: string; match: (b: Booking) => boolean; order: 'start' | 'recent' }[] = [
  { id: 'waiting', owner: 'Needs your answer', renter: 'Waiting for the owner', match: (b) => b.status === 'requested', order: 'start' },
  { id: 'upcoming', owner: 'Coming up', renter: 'Coming up', match: (b) => b.status === 'accepted', order: 'start' },
  { id: 'out', owner: 'Out with renters', renter: 'With you now', match: (b) => b.status === 'active', order: 'start' },
  { id: 'past', owner: 'Past', renter: 'Past', match: (b) => ['completed', 'declined', 'cancelled'].includes(b.status), order: 'recent' },
]

const PAST_SHOWN = 5

function Bookings({ role, bookings, data, onChanged, onTab }: { role: Role; bookings: Booking[]; data: Data; onChanged: (m: string) => void; onTab: (t: Tab) => void }) {
  const [allPast, setAllPast] = useState(false)
  if (!bookings.length) {
    return role === 'owner' ? (
      <EmptyState
        title="No requests yet"
        action={data.listings.some((l) => l.status === 'active') ? <ButtonLink to="/list" variant="outline">List another item</ButtonLink> : <ButtonLink to="/list">List an item</ButtonLink>}
      >
        {data.listings.some((l) => l.status === 'active')
          ? 'When someone asks to rent one of your items, it shows up here for you to accept or decline.'
          : 'List something and requests from renters will show up here.'}
        {data.listings.length > 0 && (
          <>
            {' '}
            <button type="button" className="font-semibold text-text underline underline-offset-4" onClick={() => onTab('listings')}>
              See your listings
            </button>
          </>
        )}
      </EmptyState>
    ) : (
      <EmptyState title="You’re not renting anything yet" action={<ButtonLink to="/browse">Find something to rent</ButtonLink>}>
        Requests you send and things you rent show up here.
      </EmptyState>
    )
  }
  return (
    <div className="space-y-10">
      {GROUPS.map((g) => {
        const items = bookings
          .filter(g.match)
          .sort((a, b) => (g.order === 'start' ? a.start.localeCompare(b.start) : b.end.localeCompare(a.end) || b.createdAt.localeCompare(a.createdAt)))
        if (!items.length) return null
        const shown = g.id === 'past' && !allPast ? items.slice(0, PAST_SHOWN) : items
        return (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="text-2xl sm:text-3xl">
              {g[role]} <span className="font-sans text-lg font-normal text-muted">({items.length})</span>
            </h2>
            <ul className="mt-4 space-y-4">
              {shown.map((b) => (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    role={role}
                    listing={data.listingById.get(b.listingId) ?? null}
                    other={data.peopleById.get(role === 'owner' ? b.renterId : b.ownerId) ?? null}
                    reviewed={data.reviewedBookings.has(b.id)}
                    onChanged={onChanged}
                  />
                </li>
              ))}
            </ul>
            {shown.length < items.length && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setAllPast(true)}>
                Show all {items.length} past rentals
              </Button>
            )}
          </section>
        )
      })}
    </div>
  )
}
