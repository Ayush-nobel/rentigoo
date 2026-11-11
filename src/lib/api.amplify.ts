import { generateClient } from 'aws-amplify/data'
import { list, remove, uploadData } from 'aws-amplify/storage'
import { categoryName } from '@shared/categories'
import type { Booking, Conversation, Listing, Message, Review, UserProfile } from '@shared/types'
import type { Schema } from '../../amplify/data/resource'
import { ApiError, type RentiGooApi } from './api'
import { searchListings } from './search'
import { getSessionUserId } from './session'

/**
 * RentiGooApi over AWS AppSync. Signed-in calls use the Cognito user pool;
 * visitors read public data through the identity pool's guest role.
 */
// Created on first use: this module is imported before Amplify.configure() runs.
let _client: ReturnType<typeof generateClient<Schema>> | null = null
const client = () => (_client ??= generateClient<Schema>())
const models = () => client().models
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

// What anyone may read about someone else (full name and consent stay private).
const PUBLIC_PROFILE = [
  'id', 'displayName', 'avatarKey', 'areaId', 'bio', 'languages', 'verifiedEmail', 'verifiedPhone',
  'verifiedGovtId', 'responseRate', 'responseTimeHrs', 'ratingAvg', 'ratingCount', 'createdAt',
] as const

function userFromDb(u: any): UserProfile {
  return {
    id: u.id,
    name: u.name ?? u.displayName ?? 'RentiGoo member',
    avatarKey: u.avatarKey ?? null,
    areaId: u.areaId,
    bio: u.bio ?? '',
    languages: clean(u.languages),
    verified: { email: Boolean(u.verifiedEmail), phone: Boolean(u.verifiedPhone), govtId: Boolean(u.verifiedGovtId) },
    responseRate: u.responseRate ?? null,
    responseTimeHrs: u.responseTimeHrs ?? null,
    ratingAvg: u.ratingAvg ?? 0,
    ratingCount: u.ratingCount ?? 0,
    joinedAt: u.createdAt,
    consent: u.consentAt ? { termsVersion: u.termsVersion, privacyVersion: u.privacyVersion, at: u.consentAt } : null,
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
const conversationFromDb = (c: any, preview = ''): Conversation => {
  const uid = getSessionUserId()
  return {
    id: c.id,
    listingId: c.listingId,
    participantIds: clean(c.participantIds) as [string, string],
    lastMessageAt: c.lastMessageAt,
    lastMessagePreview: preview,
    unread: Boolean(c.lastSenderId && c.lastSenderId !== uid && !clean(c.readBy).includes(uid ?? '')),
  }
}
const messageFromDb = (x: any): Message => ({
  id: x.id,
  conversationId: x.conversationId,
  senderId: x.senderId,
  text: x.text,
  sentAt: x.sentAt,
  ...(x.readAt ? { readAt: x.readAt } : {}),
})
/* oxlint-enable typescript/no-explicit-any */

// Active listings change rarely; keep them briefly so filtering feels instant.
let listingCache: { at: number; items: Listing[] } | null = null
async function activeListings(): Promise<Listing[]> {
  if (listingCache && Date.now() - listingCache.at < 30_000) return listingCache.items
  const rows = await all((nextToken) => models().Listing.list({ filter: { status: { eq: 'active' } }, nextToken, limit: 200, authMode: authMode() }))
  listingCache = { at: Date.now(), items: rows.map(listingFromDb) }
  return listingCache.items
}
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export const amplifyApi: RentiGooApi = {
  async searchListings(filters) {
    return searchListings(await activeListings(), filters, categoryName)
  },

  async getListing(id) {
    const l = check(await models().Listing.get({ id }, { authMode: authMode() }))
    if (!l) return null
    const listing = listingFromDb(l)
    return listing.status !== 'active' && listing.ownerId !== getSessionUserId() ? null : listing
  },

  async listListingsByOwner(ownerId) {
    const rows = await all((nextToken) => models().Listing.listListingsByOwner({ ownerId }, { nextToken, authMode: authMode() }))
    const mine = ownerId === getSessionUserId()
    return rows.map(listingFromDb).filter((l) => mine || l.status === 'active').sort(byNewest)
  },

  async createListing(input) {
    me()
    const saved = check(await client().mutations.saveListing({ listing: JSON.stringify(input) }))
    if (!saved) throw new ApiError('Your listing wasn’t saved. Please try again.', 'conflict')
    listingCache = null
    return listingFromDb(saved)
  },

  async updateListing(id, patch) {
    me()
    const saved = check(await client().mutations.saveListing({ id, listing: JSON.stringify(patch) }))
    if (!saved) throw new ApiError('Your changes weren’t saved. Please try again.', 'conflict')
    listingCache = null
    return listingFromDb(saved)
  },

  async deleteListing(id) {
    me()
    const r = check(await client().mutations.deleteMyListing({ id }))
    listingCache = null
    return { declinedRequests: r?.declinedRequests ?? 0 }
  },

  async uploadListingPhoto({ blob, ext }) {
    me()
    const name = `${crypto.randomUUID()}.${ext}`
    const { path } = await uploadData({
      path: ({ identityId }) => `listing-photos/${identityId}/${name}`,
      data: blob,
      // Each upload gets a new name, so browsers can keep it for good.
      options: { contentType: ext === 'webp' ? 'image/webp' : 'image/jpeg', cacheControl: 'public, max-age=31536000, immutable' },
    }).result
    return path
  },

  async discardListingPhotos(keys) {
    await Promise.allSettled(keys.map((path) => remove({ path })))
  },

  async getUser(id) {
    const self = id === getSessionUserId()
    const opts = self ? {} : { authMode: authMode(), selectionSet: PUBLIC_PROFILE }
    const u = check(await models().UserProfile.get({ id }, opts as never))
    return u ? userFromDb(u) : null
  },

  async getUsers(ids) {
    const users = await Promise.all([...new Set(ids)].map((id) => amplifyApi.getUser(id)))
    return users.filter((u): u is UserProfile => u !== null)
  },

  async createMyProfile(input) {
    me()
    const u = check(await client().mutations.createMyProfile(input))
    if (!u) throw new ApiError('Your profile wasn’t saved. Please try again.', 'conflict')
    return userFromDb(u)
  },

  async deleteMyAccount() {
    me()
    // Photos uploaded but never saved on a listing: clear our own folder first
    // (best effort; the server deletes the folders of saved listings too).
    try {
      const { items } = await list({ path: ({ identityId }) => `listing-photos/${identityId}/`, options: { listAll: true } })
      await Promise.allSettled(items.map((i) => remove({ path: i.path })))
    } catch {
      /* nothing uploaded, or offline: carry on */
    }
    const summary = check(await client().mutations.deleteMyAccount())
    if (!summary) throw new ApiError('Your account wasn’t deleted. Please try again.', 'conflict')
    listingCache = null
    return summary
  },

  async listReviewsByAuthor(authorId) {
    return (await all((nextToken) => models().Review.listReviewsByAuthor({ authorId }, { nextToken, authMode: authMode() }))).map(reviewFromDb).sort(byNewest)
  },

  async updateMyProfile(patch) {
    const id = me()
    return userFromDb(check(await models().UserProfile.update({ id, ...patch } as never)))
  },

  async listReviewsForListing(listingId) {
    return (await all((nextToken) => models().Review.listReviewsByListing({ listingId }, { nextToken, authMode: authMode() }))).map(reviewFromDb).sort(byNewest)
  },

  async listReviewsForUser(userId) {
    return (await all((nextToken) => models().Review.listReviewsByTarget({ targetUserId: userId }, { nextToken, authMode: authMode() }))).map(reviewFromDb).sort(byNewest)
  },

  async requestBooking(req) {
    me()
    const b = check(await client().mutations.requestBooking({ ...req, message: req.message ?? null }))
    if (!b) throw new ApiError('Your request wasn’t sent. Please try again.', 'conflict')
    return bookingFromDb(b)
  },

  async respondToBooking(bookingId, accept) {
    me()
    const b = check(await client().mutations.respondToBooking({ bookingId, action: accept ? 'accept' : 'decline' }))
    listingCache = null
    return bookingFromDb(b)
  },

  async cancelBooking(bookingId) {
    me()
    const b = check(await client().mutations.respondToBooking({ bookingId, action: 'cancel' }))
    listingCache = null
    return bookingFromDb(b)
  },

  async markHandedOver(bookingId) {
    me()
    return bookingFromDb(check(await client().mutations.respondToBooking({ bookingId, action: 'handover' })))
  },

  async markReturned(bookingId) {
    me()
    const b = bookingFromDb(check(await client().mutations.respondToBooking({ bookingId, action: 'return' })))
    listingCache = null
    return b
  },

  async submitReview(bookingId, rating, text) {
    me()
    const r = check(await client().mutations.submitReview({ bookingId, rating, text }))
    if (!r) throw new ApiError('Your review wasn’t saved. Please try again.', 'conflict')
    return reviewFromDb(r)
  },

  async getOwnerStats() {
    me()
    const s = check(await client().queries.ownerStats())
    return s ?? { earnedThisMonth: 0, earnedTotal: 0, pendingRequests: 0, activeRentals: 0, upcomingRentals: 0 }
  },

  async listMyBookings() {
    const renterId = me()
    return (await all((nextToken) => models().Booking.listBookingsByRenter({ renterId }, { nextToken }))).map(bookingFromDb).sort(byNewest)
  },

  async listRequestsForMe() {
    const ownerId = me()
    return (await all((nextToken) => models().Booking.listBookingsByOwner({ ownerId }, { nextToken }))).map(bookingFromDb).sort(byNewest)
  },

  async listConversations() {
    me()
    const rows = await all((nextToken) => models().Conversation.list({ nextToken }))
    // The preview is read from the latest message itself, so it disappears if that message is removed.
    const latest = await Promise.all(
      rows.map((c) => models().Message.listMessagesByConversation({ conversationId: c.id }, { sortDirection: 'DESC', limit: 1 }).then((r) => r.data?.[0]?.text ?? '')),
    )
    return rows.map((c, i) => conversationFromDb(c, latest[i]!.slice(0, 140))).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  },

  async listMessages(conversationId) {
    me()
    const rows = await all((nextToken) => models().Message.listMessagesByConversation({ conversationId }, { nextToken, sortDirection: 'ASC' }))
    return rows.map(messageFromDb)
  },

  async sendMessage(conversationId, text) {
    me()
    const body = text.trim()
    if (!body) throw new ApiError('Write a message first.', 'invalid')
    if (body.length > 2000) throw new ApiError('That message is too long. Keep it under 2,000 characters.', 'invalid')
    const msg = check(await client().mutations.sendMessage({ conversationId, text: body }))
    if (!msg) throw new ApiError('Your message wasn’t sent. Please try again.', 'conflict')
    return messageFromDb(msg)
  },

  async openConversation(listingId, otherUserId) {
    me()
    const c = check(await client().mutations.openConversation({ listingId, otherUserId }))
    if (!c) throw new ApiError('We couldn’t open the conversation. Please try again.', 'conflict')
    return conversationFromDb(c)
  },

  async markConversationRead(conversationId) {
    me()
    check(await client().mutations.markConversationRead({ conversationId }))
  },

  subscribeToMessages(conversationId, onMessage) {
    const sub = models().Message.onCreate({ filter: { conversationId: { eq: conversationId } } }).subscribe({
      next: (x) => onMessage(messageFromDb(x)),
      error: (e) => console.warn('Live messages paused', e),
    })
    return () => sub.unsubscribe()
  },
}
