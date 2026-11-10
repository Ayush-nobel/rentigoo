/**
 * Store backed by the Amplify data client (IAM). Converts between the
 * database's enum spellings (like_new, pay_at_pickup) and the app's.
 */
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import type { Schema } from '../../data/resource'
import type { Booking, Review } from '../../../shared/types'
import type { Store, StoredBooking, StoredListing } from './bookings'

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
const toDb = <T extends string>(s: string) => s.replace(/-/g, '_') as T

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
    pricing: { daily: l.pricing.daily, ...(l.pricing.weekly ? { weekly: l.pricing.weekly } : {}), ...(l.pricing.monthly ? { monthly: l.pricing.monthly } : {}) },
    ratingAvg: l.ratingAvg ?? 0,
    ratingCount: l.ratingCount ?? 0,
  }
}

export function bookingFromDb(b: any): StoredBooking {
  return { ...b, paymentStatus: toApp(b.paymentStatus) as Booking['paymentStatus'], message: b.message ?? undefined }
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
      const created = check(await m.Booking.create({ ...b, paymentStatus: toDb(b.paymentStatus) }))
      if (!created) throw new Error('Booking was not saved')
      return bookingFromDb(created)
    },
    async setBookingStatus(id, status, paymentStatus) {
      const updated = check(await m.Booking.update({ id, status, ...(paymentStatus ? { paymentStatus: toDb(paymentStatus) } : {}) }))
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
