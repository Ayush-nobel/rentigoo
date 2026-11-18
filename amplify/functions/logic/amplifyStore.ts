/**
 * Store backed by the Amplify data client (IAM). Converts between the
 * database's enum spellings (like_new, pay_at_pickup) and the app's.
 */
import type { PhotoUploadStore } from './photos'
import type { ConditionStore } from './conditionReports'
import { forgetIdCheck, IdClaimTaken, type IdStore } from './idCheck'
import type { FeeStore } from './bookingFee'
import type { ConditionReport } from '../../../shared/conditionReports'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import type { Schema } from '../../data/resource'
import type { Booking, Review } from '../../../shared/types'
import type { Store, StoredBooking, StoredListing } from './bookings'
import type { AccountStore } from './account'
import type { DeleteListingStore } from './listings'
import type { MessageStore, StoredConversation, StoredMessage } from './messages'
import { requestRebuild } from './rebuild'
import { ClaimTaken, forgetPhone as forgetPhoneCheck, type PhoneCheck, type PhoneStore } from './phone'
import type { ListingDraft } from '../../../shared/listingRules'

type Client = ReturnType<typeof generateClient<Schema>>

let clientPromise: Promise<Client> | null = null

/** Configure Amplify once per Lambda container. */
export function dataClient(env: Record<string, unknown>): Promise<Client> {
  clientPromise ??= getAmplifyDataClientConfig(env as never).then(({ resourceConfig, libraryOptions }) => {
    Amplify.configure(resourceConfig, libraryOptions)
    return generateClient<Schema>()
  })
  return clientPromise
}

const toApp = (s: string) => s.replace(/_/g, '-')
type DbPayment = 'unpaid' | 'pay_at_pickup' | 'paid'
const toDb = (s: string) => s.replace(/-/g, '_') as DbPayment

function check<T>(res: { data: T; errors?: { message: string }[] | undefined }): T {
  if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join('; '))
  return res.data
}

async function all<T>(page: (token?: string | null) => Promise<{ data: T[]; nextToken?: string | null; errors?: { message: string }[] }>) {
  const out: T[] = []
  let token: string | null | undefined
  do {
    const res = await page(token)
    out.push(...check(res))
    token = res.nextToken
  } while (token)
  return out
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function listingFromDb(l: any): StoredListing {
  return {
    ...l,
    condition: toApp(l.condition),
    photos: l.photos ?? [],
    blockedDates: (l.blockedDates ?? []).filter(Boolean),
    bookedDates: (l.bookedDates ?? []).filter(Boolean),
    rules: (l.rules ?? []).filter(Boolean),
    pricing: { ...(l.pricing.daily != null ? { daily: l.pricing.daily } : {}), ...(l.pricing.weekly ? { weekly: l.pricing.weekly } : {}), ...(l.pricing.monthly ? { monthly: l.pricing.monthly } : {}) },
    months: l.months ?? undefined,
    ratingAvg: l.ratingAvg ?? 0,
    ratingCount: l.ratingCount ?? 0,
  }
}

export function bookingFromDb(b: any): StoredBooking {
  const q = Object.fromEntries(Object.entries(b.quote ?? {}).filter(([, v]) => v !== null))
  return {
    ...b,
    quote: q,
    paymentStatus: toApp(b.paymentStatus) as Booking['paymentStatus'],
    message: b.message ?? undefined,
    paidMonths: b.paidMonths ?? undefined,
    notice: b.notice ?? null,
    fee: b.feeStatus
      ? {
          status: b.feeStatus,
          amount: b.feeAmount ?? 0,
          paidAt: b.feePaidAt ?? undefined,
          linkId: b.feeLinkId ?? undefined,
          linkUrl: b.feeLinkUrl ?? undefined,
          paymentId: b.feePaymentId ?? undefined,
        }
      : null,
  }
}

const reviewFromDb = (r: any): Review => r as Review
/* eslint-enable @typescript-eslint/no-explicit-any */

export function amplifyStore(client: Client): Store {
  const m = client.models
  return {
    async getListing(id) {
      const l = check(await m.Listing.get({ id }))
      return l ? listingFromDb(l) : null
    },
    async setListingBookedDates(id, dates) {
      // Casts: generated input types are wrong for models with read-only fields.
      check(await m.Listing.update({ id, bookedDates: dates } as never))
    },
    async setListingRating(id, avg, count) {
      check(await m.Listing.update({ id, ratingAvg: avg, ratingCount: count } as never))
    },
    async getBooking(id) {
      const b = check(await m.Booking.get({ id }))
      return b ? bookingFromDb(b) : null
    },
    async listBookingsForListing(listingId) {
      return (await all((nextToken) => m.Booking.listBookingsByListing({ listingId }, { nextToken }))).map(bookingFromDb)
    },
    async listBookingsForOwner(ownerId) {
      return (await all((nextToken) => m.Booking.listBookingsByOwner({ ownerId }, { nextToken }))).map(bookingFromDb)
    },
    async createBooking(b) {
      const created = check(await m.Booking.create({ ...b, paymentStatus: toDb(b.paymentStatus), message: b.message ?? null }))
      if (!created) throw new Error('Booking was not saved')
      return bookingFromDb(created)
    },
    async setBookingStatus(id, status, paymentStatus) {
      const updated = check(await m.Booking.update({ id, status, ...(paymentStatus ? { paymentStatus: toDb(paymentStatus) } : {}) }))
      if (!updated) throw new Error('Booking was not updated')
      return bookingFromDb(updated)
    },
    async setBookingFee(id, fee) {
      const f = fee as Record<string, unknown>
      const row: Record<string, unknown> = { id, feeStatus: fee.status }
      for (const [k, col] of [['amount', 'feeAmount'], ['paidAt', 'feePaidAt'], ['linkId', 'feeLinkId'], ['linkUrl', 'feeLinkUrl'], ['paymentId', 'feePaymentId']] as const) {
        if (f[k] !== undefined) row[col] = f[k]
      }
      check(await m.Booking.update(row as never))
    },
    async updateBookingTerms(id, patch) {
      const updated = check(await m.Booking.update({ id, ...patch } as never))
      if (!updated) throw new Error('Booking was not updated')
      return bookingFromDb(updated)
    },
    async listReviewsForBooking(bookingId) {
      return (await all((nextToken) => m.Review.listReviewsByBooking({ bookingId }, { nextToken }))).map(reviewFromDb)
    },
    async listReviewsForListing(listingId) {
      return (await all((nextToken) => m.Review.listReviewsByListing({ listingId }, { nextToken }))).map(reviewFromDb)
    },
    async listReviewsForUser(userId) {
      return (await all((nextToken) => m.Review.listReviewsByTarget({ targetUserId: userId }, { nextToken }))).map(reviewFromDb)
    },
    async createReview(r) {
      const created = check(await m.Review.create(r))
      if (!created) throw new Error('Review was not saved')
      return reviewFromDb(created)
    },
    async setUserRating(userId, avg, count) {
      check(await m.UserProfile.update({ id: userId, ratingAvg: avg, ratingCount: count } as never))
    },
  }
}

type Photos = Pick<DeleteListingStore, 'deletePhotos'> & Pick<AccountStore, 'deletePhotoFolders'>

const listingToDb = (l: ListingDraft) => ({
  ...l,
  condition: toDb(l.condition) as never,
  // Absent optional fields are cleared, not left as they were.
  deliveryFee: l.deliveryFee ?? null,
  months: l.months ?? null,
  pricing: { daily: l.pricing.daily ?? null, weekly: l.pricing.weekly ?? null, monthly: l.pricing.monthly ?? null },
})

/** Store for saveListing and deleteMyListing. */
export function listingStore(client: Client, base: Store, photos: Photos): DeleteListingStore {
  const m = client.models
  return {
    getListing: base.getListing,
    async createListing(l) {
      const created = check(await m.Listing.create({ ...listingToDb(l), bookedDates: [], ratingAvg: 0, ratingCount: 0 } as never))
      if (!created) throw new Error('Listing was not saved')
      return listingFromDb(created)
    },
    async updateListing(id, l) {
      const updated = check(await m.Listing.update({ id, ...listingToDb(l) } as never))
      if (!updated) throw new Error('Listing was not updated')
      return listingFromDb(updated)
    },
    deletePhotos: photos.deletePhotos,
    publicListingsChanged: () => requestRebuild('a listing was published, edited, paused or deleted'),
    listBookingsForListing: base.listBookingsForListing,
    setBookingStatus: base.setBookingStatus,
    async deleteListing(id) {
      check(await m.Listing.delete({ id }))
    },
  }
}

/** Store with the extra operations account deletion needs. */
export function accountStore(client: Client, deleteLogin: (id: string) => Promise<void>, photos: Photos): AccountStore {
  const base = amplifyStore(client)
  const m = client.models
  return {
    ...base,
    async listBookingsAsRenter(userId) {
      return (await all((nextToken) => m.Booking.listBookingsByRenter({ renterId: userId }, { nextToken }))).map(bookingFromDb)
    },
    async listListingsOwnedBy(userId) {
      return (await all((nextToken) => m.Listing.listListingsByOwner({ ownerId: userId }, { nextToken }))).map(listingFromDb)
    },
    async deleteListing(id) {
      check(await m.Listing.delete({ id }))
    },
    deletePhotoFolders: photos.deletePhotoFolders,
    async deleteConditionReportsBy(userId) {
      const mine = await all((nextToken) => m.ConditionReport.listConditionReportsByAuthor({ authorId: userId }, { nextToken }))
      for (const r of mine) check(await m.ConditionReport.delete({ id: r.id }))
    },
    async forgetPhone(id) {
      await forgetPhoneCheck({ store: phoneStore(client) }, id)
    },
    async forgetId(id) {
      await forgetIdCheck({ store: idStore(client) }, id)
    },
    publicListingsChanged: () => requestRebuild('an owner deleted their account'),
    async listReviewsByAuthor(userId) {
      return (await all((nextToken) => m.Review.listReviewsByAuthor({ authorId: userId }, { nextToken }))).map(reviewFromDb)
    },
    async deleteReview(id) {
      check(await m.Review.delete({ id }))
    },
    async listMessageIdsBySender(userId) {
      return (await all((nextToken) => m.Message.listMessagesBySender({ senderId: userId }, { nextToken }))).map((x) => x.id)
    },
    async redactMessage(id, text) {
      check(await m.Message.update({ id, text } as never))
    },
    async clearBookingMessage(id) {
      check(await m.Booking.update({ id, message: null } as never))
    },
    async deleteProfile(id) {
      const res = await m.UserProfile.delete({ id })
      if (res.errors?.length && !/not found|conditional/i.test(res.errors[0]!.message)) check(res)
    },
    deleteLogin,
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const convoFromDb = (c: any): StoredConversation => ({
  ...c, // keeps createdAt/updatedAt, which the API must return
  id: c.id,
  listingId: c.listingId,
  participantIds: (c.participantIds ?? []).filter(Boolean),
  lastMessageAt: c.lastMessageAt,
  lastSenderId: c.lastSenderId ?? null,
  readBy: (c.readBy ?? []).filter(Boolean),
})
const messageFromDb = (m: any): StoredMessage => ({ ...m, participantIds: (m.participantIds ?? []).filter(Boolean), readAt: m.readAt ?? null })
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Store for the messages function. */
export function messageStore(client: Client, base: Store): MessageStore {
  const m = client.models
  return {
    getListing: base.getListing,
    async getConversation(id) {
      const c = check(await m.Conversation.get({ id }))
      return c ? convoFromDb(c) : null
    },
    async listConversationsForListing(listingId) {
      return (await all((nextToken) => m.Conversation.listConversationsByListing({ listingId }, { nextToken }))).map(convoFromDb)
    },
    async createConversation(c) {
      const created = check(await m.Conversation.create(c as never))
      if (!created) throw new Error('Conversation was not saved')
      return convoFromDb(created)
    },
    async updateConversation(id, patch) {
      const updated = check(await m.Conversation.update({ id, ...patch } as never))
      if (!updated) throw new Error('Conversation was not updated')
      return convoFromDb(updated)
    },
    async createMessage(msg) {
      const created = check(await m.Message.create(msg as never))
      if (!created) throw new Error('Message was not saved')
      return messageFromDb(created)
    },
    async listMessages(conversationId) {
      return (await all((nextToken) => m.Message.listMessagesByConversation({ conversationId }, { nextToken }))).map(messageFromDb)
    },
    async setMessageRead(id, at) {
      check(await m.Message.update({ id, readAt: at } as never))
    },
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const checkFromDb = (c: any): PhoneCheck => ({
  userId: c.id,
  verifiedHash: c.verifiedHash ?? null,
  pendingHash: c.pendingHash ?? null,
  codeHash: c.codeHash ?? null,
  expiresAt: c.expiresAt ?? null,
  attempts: c.attempts ?? 0,
  sendDay: c.sendDay,
  sendsToday: c.sendsToday ?? 0,
  lastSentAt: c.lastSentAt ?? null,
})
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Store for the phone-check function (and account deletion). */
export function phoneStore(client: Client): PhoneStore {
  const m = client.models
  return {
    async getCheck(userId) {
      const c = check(await m.PhoneCheck.get({ id: userId }))
      return c ? checkFromDb(c) : null
    },
    async putCheck(c) {
      const { userId, ...rest } = c
      const existing = check(await m.PhoneCheck.get({ id: userId }))
      if (existing) check(await m.PhoneCheck.update({ id: userId, ...rest }))
      else check(await m.PhoneCheck.create({ id: userId, ...rest }))
    },
    async deleteCheck(userId) {
      await m.PhoneCheck.delete({ id: userId })
    },
    async getClaim(hash) {
      return check(await m.PhoneClaim.get({ id: hash }))?.userId ?? null
    },
    async claim(hash, userId) {
      const res = await m.PhoneClaim.create({ id: hash, userId })
      if (res.errors?.length) {
        // Already exists: fine if it's theirs, otherwise taken.
        const owner = check(await m.PhoneClaim.get({ id: hash }))?.userId
        if (owner !== userId) throw new ClaimTaken()
      }
    },
    async releaseClaim(hash) {
      await m.PhoneClaim.delete({ id: hash })
    },
    async sendsToNumberToday(hash, day) {
      return check(await m.PhoneSendCount.get({ id: `${hash}:${day}` }))?.count ?? 0
    },
    async countSendToNumber(hash, day) {
      const id = `${hash}:${day}`
      const cur = check(await m.PhoneSendCount.get({ id }))
      const ttl = Math.floor(Date.now() / 1000) + 2 * 86_400
      if (cur) check(await m.PhoneSendCount.update({ id, count: cur.count + 1, ttl }))
      else check(await m.PhoneSendCount.create({ id, count: 1, ttl }))
    },
    async setProfilePhoneVerified(userId, verified) {
      // The profile may not exist yet (or any more); nothing to update then.
      await m.UserProfile.update({ id: userId, verifiedPhone: verified } as never)
    },
  }
}

/** Store for listing photo uploads (startPhotoUpload, discardPhotos). */
export function photoUploadStore(client: Client, photos: Omit<PhotoUploadStore, 'photosOnListings'>): PhotoUploadStore {
  const m = client.models
  return {
    ...photos,
    async photosOnListings(userId) {
      const owned = await all((nextToken) => m.Listing.listListingsByOwner({ ownerId: userId }, { nextToken }))
      return owned.flatMap((l) => listingFromDb(l).photos.map((p) => p.key))
    },
  }
}

// oxlint-disable-next-line typescript/no-explicit-any
const reportFromDb = (r: any): ConditionReport => ({
  id: r.id,
  bookingId: r.bookingId,
  stage: r.stage,
  authorId: r.authorId,
  checks: typeof r.checks === 'string' ? JSON.parse(r.checks) : r.checks,
  notes: r.notes,
  photoKeys: r.photoKeys ?? [],
  createdAt: r.recordedAt,
})

/** Store for pickup and return checks. */
export function conditionStore(client: Client, files: Pick<ConditionStore, 'countPhotos' | 'presignUpload' | 'viewUrl' | 'deletePhotos'>): ConditionStore {
  const m = client.models
  return {
    ...files,
    async getBooking(id) {
      const b = check(await m.Booking.get({ id }))
      return b ? { ...bookingFromDb(b), updatedAt: b.updatedAt } : null
    },
    async listReports(bookingId) {
      return (await all((nextToken) => m.ConditionReport.listConditionReportsByBooking({ bookingId }, { nextToken }))).map(reportFromDb)
    },
    async listAllReports() {
      return (await all((nextToken) => m.ConditionReport.list({ nextToken }))).map(reportFromDb)
    },
    async putReport(r) {
      const row = { id: r.id, bookingId: r.bookingId, stage: r.stage, authorId: r.authorId, checks: JSON.stringify(r.checks), notes: r.notes, photoKeys: r.photoKeys, recordedAt: r.createdAt }
      const existing = check(await m.ConditionReport.get({ id: r.id }))
      check(existing ? await m.ConditionReport.update(row as never) : await m.ConditionReport.create(row as never))
    },
    async deleteReport(id) {
      check(await m.ConditionReport.delete({ id }))
    },
  }
}

/** Store for ID checks: a record per account, and claims so one ID checks one account. */
export function idStore(client: Client): IdStore {
  const m = client.models
  return {
    async getProfileName(userId) {
      return check(await m.UserProfile.get({ id: userId }))?.name ?? null
    },
    async getCheck(userId) {
      const c = check(await m.IdCheck.get({ id: userId }))
      return c ? { userId, pendingRequestId: c.pendingRequestId ?? null, verifiedHash: c.verifiedHash ?? null, verifiedAt: c.verifiedAt ?? null } : null
    },
    async putCheck({ userId, ...rest }) {
      const existing = check(await m.IdCheck.get({ id: userId }))
      if (existing) check(await m.IdCheck.update({ id: userId, ...rest }))
      else check(await m.IdCheck.create({ id: userId, ...rest }))
    },
    async deleteCheck(userId) {
      await m.IdCheck.delete({ id: userId })
    },
    async getClaim(hash) {
      return check(await m.IdClaim.get({ id: hash }))?.userId ?? null
    },
    async claim(hash, userId) {
      const res = await m.IdClaim.create({ id: hash, userId })
      if (res.errors?.length) {
        const owner = check(await m.IdClaim.get({ id: hash }))?.userId
        if (owner !== userId) throw new IdClaimTaken()
      }
    },
    async releaseClaim(hash) {
      await m.IdClaim.delete({ id: hash })
    },
    async setProfileIdVerified(userId, verified) {
      await m.UserProfile.update({ id: userId, verifiedGovtId: verified } as never)
    },
  }
}

/** Store for the booking fee. */
export function feeStore(client: Client): FeeStore {
  const base = amplifyStore(client)
  const m = client.models
  return {
    getBooking: base.getBooking,
    setFee: base.setBookingFee,
    async listRefundsDue() {
      return (await all((nextToken) => m.Booking.list({ filter: { feeStatus: { eq: 'refund_due' } }, nextToken }))).map(bookingFromDb)
    },
  }
}
