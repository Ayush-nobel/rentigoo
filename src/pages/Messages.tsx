import { ArrowLeft, MessageCircle, Send, ShieldCheck } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import type { Conversation, Listing, Message, UserProfile } from '@shared/types'
import { Seo } from '@/components/layout/Seo'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { TextAreaField } from '@/components/ui/Field'
import { ListingImage } from '@/components/ui/ListingImage'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { api, ApiError } from '@/lib'
import { clockTime, relativeTime, rupees } from '@/lib/format'
import { cx } from '@/lib/cx'

interface Inbox {
  conversations: Conversation[]
  people: Map<string, UserProfile>
  listings: Map<string, Listing>
}

async function loadInbox(userId: string): Promise<Inbox> {
  const conversations = await api.listConversations()
  const otherIds = conversations.map((c) => c.participantIds.find((p) => p !== userId)!).filter(Boolean)
  const [people, listings] = await Promise.all([
    api.getUsers(otherIds),
    Promise.all([...new Set(conversations.map((c) => c.listingId))].map((id) => api.getListing(id).catch(() => null))),
  ])
  return {
    conversations,
    people: new Map(people.map((p) => [p.id, p])),
    listings: new Map(listings.filter((l): l is Listing => l !== null).map((l) => [l.id, l])),
  }
}

export default function Messages() {
  const { user } = useAuth()
  const { conversationId } = useParams()
  const [tick, setTick] = useState(0)
  const inbox = useAsync(() => loadInbox(user!.id), [user?.id, tick])
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  if (!user) return null
  const data = inbox.data
  const active = data?.conversations.find((c) => c.id === conversationId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
      <Seo title="Messages" description="" noindex />
      <h1 className={cx('text-4xl sm:text-5xl', conversationId && 'sr-only md:not-sr-only')}>Messages</h1>

      <div className="mt-4 grid gap-6 md:mt-6 md:grid-cols-[20rem_1fr] md:items-start">
        <section aria-labelledby="inbox-title" className={cx('min-w-0', conversationId && 'hidden md:block')}>
          <h2 id="inbox-title" className="sr-only">
            Your conversations
          </h2>
          {inbox.status === 'loading' && !data && <ListSkeleton />}
          {inbox.status === 'error' && !data && (
            <p role="alert" className="text-danger">
              Your messages didn’t load.{' '}
              <button type="button" className="font-semibold underline underline-offset-4" onClick={refresh}>
                Try again
              </button>
            </p>
          )}
          {data && data.conversations.length === 0 && (
            <EmptyState icon={<MessageCircle aria-hidden="true" className="size-7" />} title="No messages yet" action={<ButtonLink to="/browse">Find something to rent</ButtonLink>}>
              To ask an owner something, open their listing and choose “Message”. Their replies show up here.
            </EmptyState>
          )}
          {data && data.conversations.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
              {data.conversations.map((c) => {
                const other = data.people.get(c.participantIds.find((p) => p !== user.id) ?? '')
                const listing = data.listings.get(c.listingId)
                const here = c.id === conversationId
                return (
                  <li key={c.id}>
                    <Link
                      to={`/messages/${c.id}`}
                      aria-current={here ? 'page' : undefined}
                      className={cx('flex gap-3 px-4 py-3.5 hover:bg-sunken', here && 'bg-sunken')}
                    >
                      <Avatar name={other?.name ?? '?'} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cx('truncate', c.unread ? 'font-bold' : 'font-semibold')}>{other?.name ?? 'Former member'}</span>
                          <span className="shrink-0 text-sm text-muted">{relativeTime(c.lastMessageAt)}</span>
                        </span>
                        <span className="block truncate text-sm text-muted">{listing?.title ?? 'A listing that’s no longer available'}</span>
                        <span className={cx('mt-0.5 flex items-center gap-2 text-[0.9375rem]', c.unread ? 'font-semibold text-text' : 'text-muted')}>
                          {c.unread && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-accent ring-2 ring-ink/70" />}
                          <span className="truncate">{c.lastMessagePreview || 'No messages yet'}</span>
                          {c.unread && <span className="sr-only">(unread)</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className={cx('min-w-0', !conversationId && 'hidden md:block')}>
          {!conversationId && data && data.conversations.length > 0 && (
            <div className="hidden rounded-[20px] border border-dashed border-line-strong p-10 text-center text-muted md:block">Choose a conversation to read it.</div>
          )}
          {conversationId && data && !active && (
            <EmptyState title="Conversation not found" action={<ButtonLink to="/messages">Back to messages</ButtonLink>}>
              It may have been removed, or the link is wrong.
            </EmptyState>
          )}
          {conversationId && !data && inbox.status === 'loading' && <Skeleton className="h-96" />}
          {active && data && (
            <Thread
              key={active.id}
              conversation={active}
              me={user.id}
              other={data.people.get(active.participantIds.find((p) => p !== user.id) ?? '') ?? null}
              listing={data.listings.get(active.listingId) ?? null}
              onActivity={refresh}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const istDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
const dayLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short' })

function Thread({ conversation, me, other, listing, onActivity }: { conversation: Conversation; me: string; other: UserProfile | null; listing: Listing | null; onActivity: () => void }) {
  const [messages, setMessages] = useState<Message[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const otherName = other?.name ?? 'Former member'
  const firstName = otherName.split(' ')[0]

  const add = useCallback((m: Message) => setMessages((ms) => (ms && !ms.some((x) => x.id === m.id) ? [...ms, m].sort((a, b) => a.sentAt.localeCompare(b.sentAt)) : ms)), [])

  useEffect(() => {
    let live = true
    api.listMessages(conversation.id).then(
      (ms) => {
        if (!live) return
        setMessages(ms)
        if (ms.some((m) => m.senderId !== me && !m.readAt)) void api.markConversationRead(conversation.id).then(onActivity, () => {})
      },
      () => live && setLoadError(true),
    )
    // New messages arrive live; theirs are marked as seen while you're looking.
    const stop = api.subscribeToMessages(conversation.id, (m) => {
      add(m)
      if (m.senderId !== me) void api.markConversationRead(conversation.id).catch(() => {})
      onActivity()
    })
    return () => {
      live = false
      stop()
    }
  }, [conversation.id, me, add, onActivity])

  // Focus the thread heading when opened from the list, so keyboard and screen reader users land in it.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [conversation.id])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' })
  }, [messages?.length])

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(null)
    try {
      const m = await api.sendMessage(conversation.id, body)
      add(m)
      setText('')
      onActivity()
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : 'Your message wasn’t sent. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  const lastMineSeen = useMemo(() => [...(messages ?? [])].reverse().find((m) => m.senderId === me)?.readAt, [messages, me])
  const lastMineId = useMemo(() => [...(messages ?? [])].reverse().find((m) => m.senderId === me)?.id, [messages, me])

  return (
    <section aria-labelledby="thread-title" className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
      <header className="flex items-center gap-3 border-b border-line p-3 sm:p-4">
        <Link to="/messages" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-sunken md:hidden" aria-label="Back to all messages">
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <Avatar name={otherName} size="md" />
        <div className="min-w-0 flex-1">
          <h2 id="thread-title" ref={heading} tabIndex={-1} className="truncate font-sans text-lg font-semibold outline-none">
            {otherName}
          </h2>
          {listing ? (
            <Link to={`/listing/${listing.id}`} className="block truncate text-[0.9375rem] text-muted underline-offset-4 hover:underline">
              About: {listing.title}
            </Link>
          ) : (
            <p className="truncate text-[0.9375rem] text-muted">About a listing that’s no longer available</p>
          )}
        </div>
        {listing && (
          <Link to={`/listing/${listing.id}`} className="hidden shrink-0 items-center gap-3 rounded-xl p-1 pr-3 hover:bg-sunken sm:flex" tabIndex={-1} aria-hidden="true">
            <span className="block size-12 overflow-hidden rounded-lg bg-sunken">
              <ListingImage photo={listing.photos[0]} decorative />
            </span>
            <span className="text-[0.9375rem] font-semibold">{rupees(listing.pricing.daily)}/day</span>
          </Link>
        )}
      </header>

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={`Messages with ${otherName}`}
        tabIndex={0}
        className="max-h-[60vh] min-h-72 overflow-y-auto px-3 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:[outline-color:var(--focus)] sm:px-5"
      >
        {loadError && <p className="text-danger">These messages didn’t load. Refresh the page to try again.</p>}
        {!messages && !loadError && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </div>
        )}
        {messages && messages.length === 0 && (
          <p className="py-10 text-center text-muted">
            Say hello to {firstName}. Ask about the item, dates or pickup.
          </p>
        )}
        {messages && messages.length > 0 && (
          <ol className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.senderId === me
              const day = istDay.format(new Date(m.sentAt))
              const newDay = i === 0 || istDay.format(new Date(messages[i - 1]!.sentAt)) !== day
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li aria-hidden="true" className="py-2 text-center text-sm font-medium text-muted">
                      {dayLabel.format(new Date(m.sentAt))}
                    </li>
                  )}
                  <li className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
                    <p className="sr-only">
                      {mine ? 'You' : firstName}, {dayLabel.format(new Date(m.sentAt))} at {clockTime(m.sentAt)}:
                    </p>
                    <p
                      className={cx(
                        'max-w-[85%] rounded-[18px] px-4 py-2.5 whitespace-pre-wrap sm:max-w-[70%]',
                        mine ? 'rounded-br-md bg-ink text-on-ink' : 'rounded-bl-md bg-sunken text-text',
                      )}
                    >
                      {m.text}
                    </p>
                    <p aria-hidden="true" className="mt-0.5 px-1 text-xs text-muted">
                      {clockTime(m.sentAt)}
                      {m.id === lastMineId && lastMineSeen ? ', seen' : ''}
                    </p>
                    {m.id === lastMineId && lastMineSeen && <p className="sr-only">Seen by {firstName}</p>}
                  </li>
                </Fragment>
              )
            })}
          </ol>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="border-t border-line p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <TextAreaField
            className="flex-1"
            label={`Message ${firstName}`}
            hideLabel
            hideCount
            rows={2}
            maxLength={2000}
            value={text}
            placeholder={`Message ${firstName}`}
            error={sendError ?? undefined}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <Button type="submit" className="mb-0.5 size-12 shrink-0 px-0" disabled={sending || !text.trim()} aria-label="Send message">
            <Send aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Enter to send, Shift + Enter for a new line. Never share an OTP or your bank details, and pay only when you have the item in hand.
        </p>
      </form>
    </section>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading conversations">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  )
}
