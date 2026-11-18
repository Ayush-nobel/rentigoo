import { profileProblem, tidyName } from '@shared/accountRules'
import { LEGAL, publicName } from '@shared/legal'
import { bookingProblem, canTransition } from '@shared/bookingRules'
import { categoryName } from '@shared/categories'
import { addMonths, isRangeAvailable, monthSchedule, noticeEnd, quoteListing, quoteListingMonths, termOf } from '@shared/pricing'
import type { Booking, Conversation, DeletionSummary, Listing, Message, Review, UserProfile } from '@shared/types'
import { deriveSnapshot, seedSnapshot, type Snapshot } from '@/data'
import { ApiError, type RentiGooApi } from './api'
import { todayIST } from './format'
import { searchListings } from './search'
import { getSessionUserId } from './session'
import { readJSON, writeJSON } from './storage'
import { rememberLocalPhoto } from './photos'
import { cleanDraft, listingErrors, photoFolder, type ListingDraft } from '@shared/listingRules'
import { ownerStatsFrom } from '@shared/earnings'
import { normaliseIndianMobile, OTP } from '@shared/phone'

// Bump when seed data changes so browsers drop their old copy.
const DB_KEY = 'mock-db-v2'

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

/** Others see the public name only, as on the real backend. */
function asSeenBy(u: UserProfile): UserProfile {
  return u.id === getSessionUserId() ? u : { ...u, name: publicName(u.name), consent: null }
}

function checkedDraft(d: ListingDraft, knownKeys?: string[]): ListingDraft {
  const today = todayIST()
  const first = Object.values(listingErrors(d, { today, knownKeys }))[0]
  if (first) throw new ApiError(first, 'invalid')
  return cleanDraft(d, today)
}

// Demo phone checks: no text is sent; the code is always 246810.
const DEMO_CODE = '246810'
let demoPhone: { pending: string | null; verified: boolean } = { pending: null, verified: false }
function setDemoPhoneVerified(uid: string, v: boolean) {
  const u = db.users.find((x) => x.id === uid)
  if (u) {
    u.verified = { ...u.verified, phone: v }
    save()
  }
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

  // Same checks as the saveListing function on the real backend.
  async createListing(input) {
    const listing: Listing = {
      ...checkedDraft(input),
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
    if (l.ownerId !== me()) throw new ApiError('That listing wasn’t found.', 'not-found')
    const next = checkedDraft({ ...l, ...patch }, l.photos.map((p) => p.key))
    delete l.deliveryFee
    Object.assign(l, next)
    save()
    return delay(findListing(listingId))
  },

  async uploadListingPhoto({ blob, ext }) {
    // Demo mode: the photo lives in this browser tab only. Same key shape as the real
    // thing: the uploader's own folder.
    const key = `${photoFolder(me())}${crypto.randomUUID()}.${ext}`
    rememberLocalPhoto(key, blob)
    return delay(key, 400)
  },

  async discardListingPhotos() {},

  async deleteListing(listingId) {
    const l = findListing(listingId)
    if (l.ownerId !== me()) throw new ApiError('That listing wasn’t found.', 'not-found')
    const mine = db.bookings.filter((b) => b.listingId === listingId)
    if (mine.some((b) => b.status === 'accepted' || b.status === 'active')) {
      throw new ApiError('This listing has a booking that isn’t finished. Pause it instead, and delete it once that rental is done or cancelled.', 'conflict')
    }
    const open = mine.filter((b) => b.status === 'requested')
    for (const b of open) b.status = 'declined'
    db.listings = db.listings.filter((x) => x.id !== listingId)
    save()
    return delay({ declinedRequests: open.length })
  },

  async getUser(userId) {
    const u = db.users.find((x) => x.id === userId) ?? null
    return delay(u && asSeenBy(u))
  },

  async getUsers(ids) {
    const set = new Set(ids)
    return delay(db.users.filter((u) => set.has(u.id)).map(asSeenBy))
  },

  async createMyProfile(input) {
    const uid = me()
    const existing = db.users.find((u) => u.id === uid)
    if (existing) return delay(existing)
    if (input.termsVersion !== LEGAL.terms.version || input.privacyVersion !== LEGAL.privacy.version) {
      throw new ApiError('Please agree to the latest Terms and Privacy Policy to continue.', 'invalid')
    }
    const name = tidyName(input.name)
    const problem = profileProblem({ name, areaId: input.areaId })
    if (problem) throw new ApiError(problem, 'invalid')
    const user: UserProfile = {
      id: uid,
      name,
      avatarKey: null,
      areaId: input.areaId,
      bio: '',
      languages: [],
      verified: { email: true, phone: false, govtId: false },
      responseRate: null,
      responseTimeHrs: null,
      ratingAvg: 0,
      ratingCount: 0,
      joinedAt: new Date().toISOString(),
      consent: { termsVersion: input.termsVersion, privacyVersion: input.privacyVersion, at: new Date().toISOString() },
    }
    db.users.push(user)
    save()
    return delay(user)
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

  async getPhoneStatus() {
    const uid = me()
    return delay({ available: true, verified: Boolean(db.users.find((u) => u.id === uid)?.verified.phone) })
  },

  async startPhoneCheck(phone) {
    me()
    const e164 = normaliseIndianMobile(phone)
    if (!e164) throw new ApiError('Enter a 10-digit Indian mobile number, e.g. 98765 43210.', 'invalid')
    demoPhone = { ...demoPhone, pending: e164 }
    return delay({ sentTo: e164, resendInSeconds: OTP.resendSeconds })
  },

  async confirmPhoneCheck(code) {
    const uid = me()
    if (!demoPhone.pending) throw new ApiError('Ask for a code first.', 'invalid')
    if (code.replace(/\D/g, '') !== DEMO_CODE) throw new ApiError('That code isn’t right. In this test version it’s 246810.', 'invalid')
    demoPhone = { pending: null, verified: true }
    setDemoPhoneVerified(uid, true)
    return delay({ available: true, verified: true })
  },

  async forgetPhone() {
    const uid = me()
    demoPhone = { pending: null, verified: false }
    setDemoPhoneVerified(uid, false)
    return delay({ available: true, verified: false })
  },

  async listReviewsByAuthor(userId) {
    return delay(db.reviews.filter((r) => r.authorId === userId).sort(byNewest))
  },

  async deleteMyAccount() {
    const uid = me()
    const mine = db.bookings.filter((b) => b.renterId === uid || b.ownerId === uid)
    if (mine.some((b) => b.status === 'active')) {
      throw new ApiError('You have a rental in progress. Once the item is returned and marked as returned, you can delete your account.', 'conflict')
    }
    const open = mine.filter((b) => b.status === 'requested' || b.status === 'accepted')
    open.forEach((b) => (b.status = 'cancelled'))
    const ownedIds = new Set(db.listings.filter((l) => l.ownerId === uid).map((l) => l.id))
    db.listings = db.listings.filter((l) => !ownedIds.has(l.id))
    const before = db.reviews.length
    db.reviews = db.reviews.filter((r) => r.authorId !== uid && r.targetUserId !== uid)
    let redacted = 0
    for (const m of db.messages) {
      if (m.senderId === uid) {
        m.text = 'This message was removed when its sender deleted their account.'
        redacted++
      }
    }
    for (const b of db.bookings) if (b.renterId === uid) delete b.message
    db.users = db.users.filter((u) => u.id !== uid)
    save()
    const summary: DeletionSummary = { cancelledBookings: open.length, deletedListings: ownedIds.size, deletedReviews: before - db.reviews.length, redactedMessages: redacted }
    return delay(summary)
  },

  async listReviewsForUser(userId) {
    return delay(db.reviews.filter((r) => r.targetUserId === userId).sort(byNewest))
  },

  async requestBooking(req) {
    const uid = me()
    const l = findListing(req.listingId)
    const monthly = req.months !== undefined
    const end = monthly ? addMonths(req.start, req.months!) : req.end
    const problem = bookingProblem(l, { ...req, end, term: monthly ? 'months' : 'days' }, uid, todayIST())
    if (problem) throw new ApiError(problem, 'conflict')
    const booking: Booking = {
      id: id('b'),
      listingId: l.id,
      renterId: uid,
      ownerId: l.ownerId,
      start: req.start,
      end,
      delivery: req.delivery,
      // Recomputed, never trusted from the client.
      quote: monthly ? quoteListingMonths(l, req.start, req.months!, req.delivery) : quoteListing(l, req.start, end, req.delivery),
      ...(monthly ? { paidMonths: 0 } : {}),
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

  async markHandedOver(bookingId) {
    const b = findBooking(bookingId)
    if (!canTransition(b, 'active', me())) throw new ApiError('This booking can’t be changed that way now.', 'conflict')
    b.status = 'active'
    save()
    return delay(findBooking(bookingId))
  },

  async markReturned(bookingId) {
    const b = findBooking(bookingId)
    if (!canTransition(b, 'completed', me())) throw new ApiError('This booking can’t be changed that way now.', 'conflict')
    b.status = 'completed'
    b.paymentStatus = 'paid'
    save()
    return delay(findBooking(bookingId))
  },

  async markMonthPaid(bookingId) {
    const b = findBooking(bookingId)
    if (b.ownerId !== me()) throw new ApiError('Only the owner can mark rent as paid.', 'forbidden')
    if (termOf(b.quote) !== 'months' || b.status !== 'active') throw new ApiError('This booking can’t be changed that way now.', 'conflict')
    const months = monthSchedule(b.start, b.end, b.quote.monthlyRate!).length
    if ((b.paidMonths ?? 0) >= months) throw new ApiError('Every month is already marked as paid.', 'conflict')
    b.paidMonths = (b.paidMonths ?? 0) + 1
    save()
    return delay(findBooking(bookingId))
  },

  async giveNotice(bookingId) {
    const uid = me()
    const b = findBooking(bookingId)
    if (b.renterId !== uid && b.ownerId !== uid) throw new ApiError('Booking not found.', 'not-found')
    if (termOf(b.quote) !== 'months' || b.status !== 'active') throw new ApiError('This booking can’t be changed that way now.', 'conflict')
    if (b.notice) throw new ApiError('Notice has already been given for this rental.', 'conflict')
    b.end = noticeEnd(todayIST(), b)
    b.notice = { at: new Date().toISOString(), by: uid }
    b.paidMonths = Math.min(b.paidMonths ?? 0, monthSchedule(b.start, b.end, b.quote.monthlyRate!).length)
    save()
    return delay(findBooking(bookingId))
  },

  async submitReview(bookingId, rating, text) {
    const uid = me()
    const b = findBooking(bookingId)
    if (b.renterId !== uid && b.ownerId !== uid) throw new ApiError('Booking not found.', 'not-found')
    if (b.status !== 'completed') throw new ApiError('You can review once the item has been returned.', 'invalid')
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError('Choose a rating from 1 to 5 stars.', 'invalid')
    const words = text.trim()
    if (words.length < 10) throw new ApiError('Write a few words about how it went (at least 10 characters).', 'invalid')
    if (words.length > 1000) throw new ApiError('Keep your review under 1,000 characters.', 'invalid')
    if (db.reviews.some((r) => r.bookingId === bookingId && r.authorId === uid)) throw new ApiError('You’ve already reviewed this rental.', 'conflict')
    const asRenter = b.renterId === uid
    const review: Review = {
      id: id('r'),
      listingId: b.listingId,
      bookingId,
      authorId: uid,
      targetUserId: asRenter ? b.ownerId : b.renterId,
      rating: rating as Review['rating'],
      text: words,
      role: asRenter ? 'renter' : 'owner',
      createdAt: new Date().toISOString(),
    }
    db.reviews.push(review)
    save()
    return delay(review)
  },

  async getOwnerStats() {
    const uid = me()
    return delay(ownerStatsFrom(db.bookings.filter((b) => b.ownerId === uid), todayIST().slice(0, 7)))
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
      db.conversations
        .filter((c) => c.participantIds.includes(uid))
        .map((c) => ({ ...c, unread: db.messages.some((m) => m.conversationId === c.id && m.senderId !== uid && !m.readAt) }))
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
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
    c.lastMessagePreview = body.slice(0, 140)
    save()
    listeners.get(conversationId)?.forEach((fn) => fn(structuredClone(m)))
    return delay(m, 60)
  },

  async openConversation(listingId, otherUserId) {
    const uid = me()
    if (uid === otherUserId) throw new ApiError('You can’t message yourself.', 'invalid')
    const l = findListing(listingId)
    if (l.ownerId !== uid && l.ownerId !== otherUserId) throw new ApiError('You can only message the owner of a listing.', 'forbidden')
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
