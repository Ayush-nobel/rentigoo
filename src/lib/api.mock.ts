import { bookingProblem, canTransition } from '@shared/bookingRules'
import { categoryName } from '@shared/categories'
import { isRangeAvailable, quoteListing } from '@shared/pricing'
import type { Booking, Conversation, Listing, Message } from '@shared/types'
import { deriveSnapshot, seedSnapshot, type Snapshot } from '@/data'
import { ApiError, type RentiGooApi } from './api'
import { todayIST } from './format'
import { searchListings } from './search'
import { getSessionUserId } from './session'
import { readJSON, writeJSON } from './storage'

const DB_KEY = 'mock-db-v1'

let db: Snapshot = readJSON<Snapshot | null>(DB_KEY, null) ?? seedSnapshot()

const listeners = new Map<string, Set<(m: Message) => void>>()

function save() {
  db = deriveSnapshot(db)
  writeJSON(DB_KEY, db)
}

/** Wipe local changes and go back to the seed data. */
export function resetMockData(): void {
  db = seedSnapshot()
  writeJSON(DB_KEY, db)
}

/** A little latency so loading states get exercised. */
const delay = <T>(value: T, ms = 120 + Math.random() * 180): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))

const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

function me(): string {
  const uid = getSessionUserId()
  if (!uid) throw new ApiError('Please log in to do that.', 'unauthorised')
  return uid
}

function findListing(listingId: string): Listing {
  const l = db.listings.find((x) => x.id === listingId)
  if (!l) throw new ApiError('That listing doesn’t exist any more.', 'not-found')
  return l
}

function findBooking(bookingId: string): Booking {
  const b = db.bookings.find((x) => x.id === bookingId)
  if (!b) throw new ApiError('Booking not found.', 'not-found')
  return b
}

function findConversationForMe(conversationId: string): Conversation {
  const uid = me()
  const c = db.conversations.find((x) => x.id === conversationId)
  if (!c || !c.participantIds.includes(uid)) throw new ApiError('Conversation not found.', 'not-found')
  return c
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const mockApi: RentiGooApi = {
  async searchListings(filters) {
    return delay(searchListings(db.listings, filters, categoryName))
  },

  async getListing(listingId) {
    const l = db.listings.find((x) => x.id === listingId) ?? null
    // Paused/draft listings are only visible to their owner.
    if (l && l.status !== 'active' && l.ownerId !== getSessionUserId()) return delay(null)
    return delay(l)
  },

  async listListingsByOwner(ownerId) {
    const mine = ownerId === getSessionUserId()
    return delay(db.listings.filter((l) => l.ownerId === ownerId && (mine || l.status === 'active')).sort(byNewest))
  },

  async createListing(input) {
    const listing: Listing = {
      ...input,
      id: id('l'),
      ownerId: me(),
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
    }
    db.listings.push(listing)
    save()
    return delay(listing)
  },

  async updateListing(listingId, patch) {
    const l = findListing(listingId)
    if (l.ownerId !== me()) throw new ApiError('You can only edit your own listings.', 'forbidden')
    Object.assign(l, patch)
    save()
    return delay(findListing(listingId))
  },

  async getUser(userId) {
    return delay(db.users.find((u) => u.id === userId) ?? null)
  },

  async getUsers(ids) {
    const set = new Set(ids)
    return delay(db.users.filter((u) => set.has(u.id)))
  },

  async updateMyProfile(patch) {
    const uid = me()
    let u = db.users.find((x) => x.id === uid)
    if (!u) throw new ApiError('Profile not found.', 'not-found')
    Object.assign(u, patch)
    save()
    u = db.users.find((x) => x.id === uid)!
    return delay(u)
  },

  async listReviewsForListing(listingId) {
    return delay(db.reviews.filter((r) => r.listingId === listingId).sort(byNewest))
  },

  async listReviewsForUser(userId) {
    return delay(db.reviews.filter((r) => r.targetUserId === userId).sort(byNewest))
  },

  async requestBooking(req) {
    const uid = me()
    const l = findListing(req.listingId)
    const problem = bookingProblem(l, req, uid, todayIST())
    if (problem) throw new ApiError(problem, 'conflict')
    const booking: Booking = {
      id: id('b'),
      listingId: l.id,
      renterId: uid,
      ownerId: l.ownerId,
      start: req.start,
      end: req.end,
      delivery: req.delivery,
      quote: quoteListing(l, req.start, req.end, req.delivery), // recomputed, never trusted from the client
      status: 'requested',
      paymentStatus: 'pay-at-pickup',
      ...(req.message?.trim() ? { message: req.message.trim() } : {}),
      createdAt: new Date().toISOString(),
    }
    db.bookings.push(booking)
    save()
    return delay(booking)
  },

  async respondToBooking(bookingId, accept) {
    const uid = me()
    const b = findBooking(bookingId)
    const to = accept ? 'accepted' : 'declined'
    if (!canTransition(b, to, uid)) throw new ApiError('This request has already been answered.', 'conflict')
    if (accept) {
      const l = findListing(b.listingId)
      // Dates may have been taken by another accepted booking in the meantime.
      if (!isRangeAvailable(b.start, b.end, l.blockedDates)) throw new ApiError('Those dates are no longer free, so this request can’t be accepted.', 'conflict')
    }
    b.status = to
    save()
    return delay(findBooking(bookingId))
  },

  async cancelBooking(bookingId) {
    const b = findBooking(bookingId)
    if (!canTransition(b, 'cancelled', me())) throw new ApiError('This booking can’t be cancelled now.', 'forbidden')
    b.status = 'cancelled'
    save()
    return delay(findBooking(bookingId))
  },

  async listMyBookings() {
    const uid = me()
    return delay(db.bookings.filter((b) => b.renterId === uid).sort(byNewest))
  },

  async listRequestsForMe() {
    const uid = me()
    return delay(db.bookings.filter((b) => b.ownerId === uid).sort(byNewest))
  },

  async listConversations() {
    const uid = me()
    return delay(
      db.conversations.filter((c) => c.participantIds.includes(uid)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    )
  },

  async listMessages(conversationId) {
    findConversationForMe(conversationId)
    return delay(db.messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.sentAt.localeCompare(b.sentAt)))
  },

  async sendMessage(conversationId, text) {
    const uid = me()
    const c = findConversationForMe(conversationId)
    const body = text.trim()
    if (!body) throw new ApiError('Write a message first.', 'invalid')
    if (body.length > 2000) throw new ApiError('That message is too long. Keep it under 2,000 characters.', 'invalid')
    const m: Message = { id: id('m'), conversationId, senderId: uid, text: body, sentAt: new Date().toISOString() }
    db.messages.push(m)
    c.lastMessageAt = m.sentAt
    c.lastMessagePreview = body
    save()
    listeners.get(conversationId)?.forEach((fn) => fn(structuredClone(m)))
    return delay(m, 60)
  },

  async openConversation(listingId, otherUserId) {
    const uid = me()
    if (uid === otherUserId) throw new ApiError('That’s your own listing.', 'invalid')
    findListing(listingId)
    let c = db.conversations.find(
      (x) => x.listingId === listingId && x.participantIds.includes(uid) && x.participantIds.includes(otherUserId),
    )
    if (!c) {
      c = { id: id('c'), listingId, participantIds: [uid, otherUserId], lastMessageAt: new Date().toISOString(), lastMessagePreview: '' }
      db.conversations.push(c)
      save()
    }
    return delay(c)
  },

  async markConversationRead(conversationId) {
    const uid = me()
    findConversationForMe(conversationId)
    const now = new Date().toISOString()
    for (const m of db.messages) {
      if (m.conversationId === conversationId && m.senderId !== uid && !m.readAt) m.readAt = now
    }
    save()
    return delay(undefined, 30)
  },

  subscribeToMessages(conversationId, onMessage) {
    let set = listeners.get(conversationId)
    if (!set) listeners.set(conversationId, (set = new Set()))
    set.add(onMessage)
    return () => set.delete(onMessage)
  },
}
