import { generateClient } from 'aws-amplify/data'
import { categoryName } from '@shared/categories'
import type { Booking, Conversation, Listing, Message, Review, UserProfile } from '@shared/types'
import type { Schema } from '../../amplify/data/resource'
import { ApiError, type ListingInput, type RentiGooApi } from './api'
import { searchListings } from './search'
import { getSessionUserId } from './session'

/**
 * RentiGooApi over AWS AppSync. Signed-in calls use the Cognito user pool;
 * visitors read public data through the identity pool's guest role.
 */
const client = generateClient<Schema>()
const m = client.models
const authMode = () => (getSessionUserId() ? 'userPool' : 'identityPool') as 'userPool' | 'identityPool'

type Errs = { message: string }[] | undefined | null

function check<T>(res: { data: T; errors?: Errs }, fallback = 'Something went wrong. Please try again.'): T {
  if (res.errors?.length) {
    const msg = res.errors[0]!.message
    // Server-side rule messages are written for people; pass them through.
    if (/not authorized|unauthorized/i.test(msg)) throw new ApiError('You don’t have access to that.', 'forbidden')
    throw new ApiError(msg || fallback, 'conflict')
  }
  return res.data
}

async function all<T>(page: (nextToken?: string | null) => Promise<{ data: T[]; nextToken?: string | null; errors?: Errs }>) {
  const out: T[] = []
  let token: string | null | undefined
  do {
    const res = await page(token)
    out.push(...check(res))
    token = res.nextToken
  } while (token)
  return out
}

function me(): string {
  const id = getSessionUserId()
  if (!id) throw new ApiError('Please log in to do that.', 'unauthorised')
  return id
}

// ---------- mapping between the database and the app ----------
const toApp = (s: string | null | undefined) => (s ?? '').replace(/_/g, '-')
const toDb = <T extends string>(s: string) => s.replace(/-/g, '_') as T
const clean = (xs: (string | null)[] | null | undefined) => (xs ?? []).filter((x): x is string => Boolean(x))

/* oxlint-disable typescript/no-explicit-any */
function listingFromDb(l: any): Listing {
  const own = clean(l.blockedDates)
  return {
    id: l.id,
    ownerId: l.ownerId,
    title: l.title,
    description: l.description,
    categoryId: l.categoryId,
    areaId: l.areaId,
    photos: (l.photos ?? []).filter(Boolean),
    condition: toApp(l.condition) as Listing['condition'],
    pricing: { daily: l.pricing.daily, ...(l.pricing.weekly ? { weekly: l.pricing.weekly } : {}), ...(l.pricing.monthly ? { monthly: l.pricing.monthly } : {}) },
    deposit: l.deposit,
    minDays: l.minDays,
    maxDays: l.maxDays,
    pickupOptions: clean(l.pickupOptions) as Listing['pickupOptions'],
    ...(l.deliveryFee != null ? { deliveryFee: l.deliveryFee } : {}),
    blockedDates: [...new Set([...own, ...clean(l.bookedDates)])].sort(),
    ownerBlockedDates: own,
    rules: clean(l.rules),
    ratingAvg: l.ratingAvg ?? 0,
    ratingCount: l.ratingCount ?? 0,
    status: l.status,
    createdAt: l.createdAt,
  }
}

function userFromDb(u: any): UserProfile {
  return {
    id: u.id,
    name: u.name,
    avatarKey: u.avatarKey ?? null,
    areaId: u.areaId,
    bio: u.bio ?? '',
    languages: clean(u.languages),
    verified: { email: Boolean(u.verifiedEmail), phone: Boolean(u.verifiedPhone), govtId: Boolean(u.verifiedGovtId) },
    responseRate: u.responseRate ?? 0,
    responseTimeHrs: u.responseTimeHrs ?? 24,
    ratingAvg: u.ratingAvg ?? 0,
    ratingCount: u.ratingCount ?? 0,
    joinedAt: u.createdAt,
  }
}

function bookingFromDb(b: any): Booking {
  return {
    id: b.id,
    listingId: b.listingId,
    renterId: b.renterId,
    ownerId: b.ownerId,
    start: b.start,
    end: b.end,
    delivery: b.delivery,
    quote: b.quote,
    status: b.status,
    paymentStatus: toApp(b.paymentStatus) as Booking['paymentStatus'],
    ...(b.message ? { message: b.message } : {}),
    createdAt: b.createdAt,
  }
}

const reviewFromDb = (r: any): Review => ({ ...r, rating: r.rating as Review['rating'] })
const conversationFromDb = (c: any): Conversation => ({
  id: c.id,
  listingId: c.listingId,
  participantIds: clean(c.participantIds) as [string, string],
  lastMessageAt: c.lastMessageAt,
  lastMessagePreview: c.lastMessagePreview ?? '',
})
const messageFromDb = (x: any): Message => ({
  id: x.id,
  conversationId: x.conversationId,
  senderId: x.senderId,
  text: x.text,
  sentAt: x.sentAt,
  ...(x.readAt ? { readAt: x.readAt } : {}),
})
/* oxlint-enable typescript/no-explicit-any */

function listingToDb(input: Partial<ListingInput>) {
  const { condition, ...rest } = input
  return { ...rest, ...(condition ? { condition: toDb<'new' | 'like_new' | 'good' | 'fair'>(condition) } : {}) }
}

// Active listings change rarely; keep them briefly so filtering feels instant.
let listingCache: { at: number; items: Listing[] } | null = null
async function activeListings(): Promise<Listing[]> {
  if (listingCache && Date.now() - listingCache.at < 30_000) return listingCache.items
  const rows = await all((nextToken) => m.Listing.list({ filter: { status: { eq: 'active' } }, nextToken, limit: 200, authMode: authMode() }))
  listingCache = { at: Date.now(), items: rows.map(listingFromDb) }
  return listingCache.items
}
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const amplifyApi: RentiGooApi = {
  async searchListings(filters) {
    return searchListings(await activeListings(), filters, categoryName)
  },

  async getListing(id) {
    const l = check(await m.Listing.get({ id }, { authMode: authMode() }))
    if (!l) return null
    const listing = listingFromDb(l)
    return listing.status !== 'active' && listing.ownerId !== getSessionUserId() ? null : listing
  },

  async listListingsByOwner(ownerId) {
    const rows = await all((nextToken) => m.Listing.listListingsByOwner({ ownerId }, { nextToken, authMode: authMode() }))
    const mine = ownerId === getSessionUserId()
    return rows.map(listingFromDb).filter((l) => mine || l.status === 'active').sort(byNewest)
  },

  async createListing(input) {
    me()
    const created = check(await m.Listing.create(listingToDb(input) as never))
    listingCache = null
    return listingFromDb(created)
  },

  async updateListing(id, patch) {
    me()
    const updated = check(await m.Listing.update({ id, ...listingToDb(patch) } as never))
    listingCache = null
    return listingFromDb(updated)
  },

  async getUser(id) {
    const u = check(await m.UserProfile.get({ id }, { authMode: authMode() }))
    return u ? userFromDb(u) : null
  },

  async getUsers(ids) {
    const users = await Promise.all([...new Set(ids)].map((id) => amplifyApi.getUser(id)))
    return users.filter((u): u is UserProfile => u !== null)
  },

  async updateMyProfile(patch) {
    const id = me()
    return userFromDb(check(await m.UserProfile.update({ id, ...patch } as never)))
  },

  async listReviewsForListing(listingId) {
    return (await all((nextToken) => m.Review.listReviewsByListing({ listingId }, { nextToken, authMode: authMode() }))).map(reviewFromDb).sort(byNewest)
  },

  async listReviewsForUser(userId) {
    return (await all((nextToken) => m.Review.listReviewsByTarget({ targetUserId: userId }, { nextToken, authMode: authMode() }))).map(reviewFromDb).sort(byNewest)
  },

  async requestBooking(req) {
    me()
    const b = check(await client.mutations.requestBooking({ ...req, message: req.message ?? null }))
    if (!b) throw new ApiError('Your request wasn’t sent. Please try again.', 'conflict')
    return bookingFromDb(b)
  },

  async respondToBooking(bookingId, accept) {
    me()
    const b = check(await client.mutations.respondToBooking({ bookingId, action: accept ? 'accept' : 'decline' }))
    listingCache = null
    return bookingFromDb(b)
  },

  async cancelBooking(bookingId) {
    me()
    const b = check(await client.mutations.respondToBooking({ bookingId, action: 'cancel' }))
    listingCache = null
    return bookingFromDb(b)
  },

  async listMyBookings() {
    const renterId = me()
    return (await all((nextToken) => m.Booking.listBookingsByRenter({ renterId }, { nextToken }))).map(bookingFromDb).sort(byNewest)
  },

  async listRequestsForMe() {
    const ownerId = me()
    return (await all((nextToken) => m.Booking.listBookingsByOwner({ ownerId }, { nextToken }))).map(bookingFromDb).sort(byNewest)
  },

  async listConversations() {
    me()
    const rows = await all((nextToken) => m.Conversation.list({ nextToken }))
    return rows.map(conversationFromDb).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  },

  async listMessages(conversationId) {
    me()
    const rows = await all((nextToken) => m.Message.listMessagesByConversation({ conversationId }, { nextToken, sortDirection: 'ASC' }))
    return rows.map(messageFromDb)
  },

  async sendMessage(conversationId, text) {
    const uid = me()
    const body = text.trim()
    if (!body) throw new ApiError('Write a message first.', 'invalid')
    if (body.length > 2000) throw new ApiError('That message is too long. Keep it under 2,000 characters.', 'invalid')
    const convo = check(await m.Conversation.get({ id: conversationId }))
    if (!convo) throw new ApiError('Conversation not found.', 'not-found')
    const sentAt = new Date().toISOString()
    const msg = check(await m.Message.create({ conversationId, senderId: uid, participantIds: clean(convo.participantIds), text: body, sentAt }))
    await m.Conversation.update({ id: conversationId, lastMessageAt: sentAt, lastMessagePreview: body.slice(0, 140) })
    return messageFromDb(msg)
  },

  async openConversation(listingId, otherUserId) {
    const uid = me()
    if (uid === otherUserId) throw new ApiError('That’s your own listing.', 'invalid')
    const mine = await all((nextToken) => m.Conversation.list({ filter: { listingId: { eq: listingId } }, nextToken }))
    const existing = mine.find((c) => clean(c.participantIds).includes(otherUserId))
    if (existing) return conversationFromDb(existing)
    const created = check(
      await m.Conversation.create({ listingId, participantIds: [uid, otherUserId], lastMessageAt: new Date().toISOString(), lastMessagePreview: '' }),
    )
    return conversationFromDb(created)
  },

  async markConversationRead(conversationId) {
    const uid = me()
    const msgs = await amplifyApi.listMessages(conversationId)
    const now = new Date().toISOString()
    await Promise.all(msgs.filter((x) => x.senderId !== uid && !x.readAt).map((x) => m.Message.update({ id: x.id, readAt: now })))
  },

  subscribeToMessages(conversationId, onMessage) {
    const sub = m.Message.onCreate({ filter: { conversationId: { eq: conversationId } } }).subscribe({
      next: (x) => onMessage(messageFromDb(x)),
      error: (e) => console.warn('Live messages paused', e),
    })
    return () => sub.unsubscribe()
  },
}
