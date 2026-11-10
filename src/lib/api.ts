import type { Booking, Conversation, DeletionSummary, ISODate, Listing, Message, Review, UserProfile } from '@shared/types'
import type { SearchFilters, SearchResult } from './search'

/** Fields an owner fills in when creating or editing a listing. */
export type ListingInput = Pick<
  Listing,
  | 'title'
  | 'description'
  | 'categoryId'
  | 'areaId'
  | 'photos'
  | 'condition'
  | 'pricing'
  | 'deposit'
  | 'minDays'
  | 'maxDays'
  | 'pickupOptions'
  | 'deliveryFee'
  | 'blockedDates'
  | 'rules'
  | 'status'
>

export interface BookingRequest {
  listingId: string
  start: ISODate
  end: ISODate
  delivery: boolean
  message?: string
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
  createListing(input: ListingInput): Promise<Listing>
  updateListing(id: string, patch: Partial<ListingInput>): Promise<Listing>

  // People and reviews
  getUser(id: string): Promise<UserProfile | null>
  getUsers(ids: string[]): Promise<UserProfile[]>
  /** First-time profile for the signed-in person (server checks name and area). */
  createMyProfile(input: { name: string; areaId: string; termsVersion: string; privacyVersion: string }): Promise<UserProfile>
  /** Permanently deletes the signed-in person's account and personal data. */
  deleteMyAccount(): Promise<DeletionSummary>
  listReviewsByAuthor(userId: string): Promise<Review[]>
  updateMyProfile(patch: Partial<Pick<UserProfile, 'name' | 'areaId' | 'bio' | 'languages' | 'avatarKey'>>): Promise<UserProfile>
  listReviewsForListing(listingId: string): Promise<Review[]>
  listReviewsForUser(userId: string): Promise<Review[]>

  // Bookings
  requestBooking(req: BookingRequest): Promise<Booking>
  respondToBooking(bookingId: string, accept: boolean): Promise<Booking>
  cancelBooking(bookingId: string): Promise<Booking>
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
