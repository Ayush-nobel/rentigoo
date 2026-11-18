import type { ListingDraft } from '@shared/listingRules'
import type { ConditionCheckId, ConditionReportView, ConditionStage } from '@shared/conditionReports'
import type { Booking, Conversation, DeletionSummary, ISODate, Listing, Message, OwnerStats, Review, UserProfile } from '@shared/types'
import type { SearchFilters, SearchResult } from './search'

/** Fields an owner fills in when creating or editing a listing. */
export type ListingInput = ListingDraft

export interface BookingRequest {
  listingId: string
  start: ISODate
  /** Return date. For a monthly rental, `start` plus `months` calendar months. */
  end: ISODate
  delivery: boolean
  message?: string
  /** Set for a monthly rental. */
  months?: number
}

/** Whether phone checks are switched on, and whether yours is done. */
export interface PhoneStatus {
  available: boolean
  verified: boolean
}

/** Thrown for problems the person can fix (dates taken, not signed in…). */
export type ApiErrorCode = 'not-found' | 'unauthorised' | 'forbidden' | 'conflict' | 'invalid'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(message: string, code: ApiErrorCode) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * The one data interface the app talks to. `api.mock.ts` implements it over
 * seed data + localStorage; `api.amplify.ts` (build step 5) over AppSync.
 * Calls that need a signed-in person use the current session.
 */
export interface RentiGooApi {
  // Listings
  searchListings(filters: SearchFilters): Promise<SearchResult>
  getListing(id: string): Promise<Listing | null>
  listListingsByOwner(ownerId: string): Promise<Listing[]>
  /** Checked by the server against shared/listingRules before it's stored. */
  createListing(input: ListingInput): Promise<Listing>
  /** Send only what changes, e.g. `{ status: 'paused' }`. */
  updateListing(id: string, patch: Partial<ListingInput>): Promise<Listing>
  /** Uploads a prepared photo to the signed-in person's folder; returns its key. */
  uploadListingPhoto(photo: { blob: Blob; ext: 'webp' | 'jpg' }): Promise<string>
  /** Deletes the listing and its photos; open requests are declined. Refused while it's booked. */
  deleteListing(id: string): Promise<{ declinedRequests: number }>
  /** Deletes photos uploaded this session that didn't end up on a listing. Best effort. */
  discardListingPhotos(keys: string[]): Promise<void>

  // People and reviews
  getUser(id: string): Promise<UserProfile | null>
  getUsers(ids: string[]): Promise<UserProfile[]>
  /** First-time profile for the signed-in person (server checks name and area). */
  createMyProfile(input: { name: string; areaId: string; termsVersion: string; privacyVersion: string }): Promise<UserProfile>
  /** Permanently deletes the signed-in person's account and personal data. */
  deleteMyAccount(): Promise<DeletionSummary>
  listReviewsByAuthor(userId: string): Promise<Review[]>

  // Phone checks (the number is never stored; see amplify/functions/logic/phone.ts)
  getPhoneStatus(): Promise<PhoneStatus>
  /** Texts a code to the number. */
  startPhoneCheck(phone: string): Promise<{ sentTo: string; resendInSeconds: number }>
  confirmPhoneCheck(code: string): Promise<PhoneStatus>
  /** Removes the check and the badge; the number can then be used on another account. */
  forgetPhone(): Promise<PhoneStatus>
  updateMyProfile(patch: Partial<Pick<UserProfile, 'name' | 'areaId' | 'bio' | 'languages' | 'avatarKey'>>): Promise<UserProfile>
  listReviewsForListing(listingId: string): Promise<Review[]>
  listReviewsForUser(userId: string): Promise<Review[]>

  // Bookings
  requestBooking(req: BookingRequest): Promise<Booking>
  respondToBooking(bookingId: string, accept: boolean): Promise<Booking>
  cancelBooking(bookingId: string): Promise<Booking>
  /** Owner: the renter has the item now. */
  markHandedOver(bookingId: string): Promise<Booking>
  /** Owner: the item is back; the rental is complete. */
  markReturned(bookingId: string): Promise<Booking>
  /** Monthly rentals, owner: the next month's rent has been received. */
  markMonthPaid(bookingId: string): Promise<Booking>
  /** Monthly rentals, either side: end it one month from today. */
  giveNotice(bookingId: string): Promise<Booking>
  /** After a completed rental, each side can review the other once. */
  submitReview(bookingId: string, rating: number, text: string): Promise<Review>
  /** Pickup and return checks on a booking: both people's, with view links for the photos. */
  listConditionReports(bookingId: string): Promise<ConditionReportView[]>
  /** Uploads one check photo (privately) and returns its key. */
  uploadConditionPhoto(bookingId: string, photo: { blob: Blob; ext: 'webp' | 'jpg' }): Promise<string>
  /** Records (or replaces) your own check for this stage. */
  saveConditionReport(input: { bookingId: string; stage: ConditionStage; checks: Record<ConditionCheckId, boolean>; notes: string; photoKeys: string[] }): Promise<ConditionReportView>
  getOwnerStats(): Promise<OwnerStats>
  listMyBookings(): Promise<Booking[]>
  listRequestsForMe(): Promise<Booking[]>

  // Messages
  listConversations(): Promise<Conversation[]>
  listMessages(conversationId: string): Promise<Message[]>
  sendMessage(conversationId: string, text: string): Promise<Message>
  openConversation(listingId: string, otherUserId: string): Promise<Conversation>
  markConversationRead(conversationId: string): Promise<void>
  /** Live updates; returns an unsubscribe function. */
  subscribeToMessages(conversationId: string, onMessage: (m: Message) => void): () => void
}
