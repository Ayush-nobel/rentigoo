/** Calendar date as `YYYY-MM-DD` (no time, no timezone). */
export type ISODate = string
/** Full timestamp as ISO 8601. */
export type ISODateTime = string

/** Cities we operate in. Add more as RentiGoo expands. */
export type RegionId = 'bhopal'

export interface Area {
  id: string
  name: string
  region: RegionId
}

export interface Category {
  id: string
  name: string
  /** One-line description shown on category tiles. */
  blurb: string
  /** Typical daily rent in rupees, used to prefill the calculators. */
  avgDailyRate: number
  /** Typical new purchase price in rupees. */
  avgPurchasePrice: number
  /** Share of the purchase price you'd get back selling it after ~2 years. */
  typicalResalePct: number
  /** Typical yearly upkeep (servicing, batteries, storage) in rupees. */
  typicalUpkeepPerYear: number
}

export interface Verification {
  email: boolean
  phone: boolean
  govtId: boolean
}

export interface UserProfile {
  id: string
  /** Your own full name when it's you; otherwise the public name ("Meera J."). */
  name: string
  /** S3 key, URL, or null for an initials avatar. */
  avatarKey: string | null
  areaId: string
  bio: string
  languages: string[]
  verified: Verification
  /** 0–100. Null until we've measured real replies; never show a made-up figure. */
  responseRate: number | null
  /** Typical hours to reply. Null until measured. */
  responseTimeHrs: number | null
  ratingAvg: number
  ratingCount: number
  joinedAt: ISODateTime
  /** Only present on your own profile: what you agreed to, and when. */
  consent?: { termsVersion: string; privacyVersion: string; at: ISODateTime } | null
}

export interface DeletionSummary {
  cancelledBookings: number
  deletedListings: number
  deletedReviews: number
  redactedMessages: number
}

export interface Photo {
  /** S3 key, absolute URL, or `ph:<categoryId>:<n>` for a built-in placeholder. */
  key: string
  alt: string
}

export type Condition = 'new' | 'like-new' | 'good' | 'fair'
export type PickupOption = 'pickup' | 'delivery'
export type ListingStatus = 'active' | 'paused' | 'draft'

export interface ListingPricing {
  daily: number
  weekly?: number
  monthly?: number
}

export interface Listing {
  id: string
  ownerId: string
  title: string
  description: string
  categoryId: string
  areaId: string
  photos: Photo[]
  condition: Condition
  pricing: ListingPricing
  deposit: number
  minDays: number
  maxDays: number
  pickupOptions: PickupOption[]
  deliveryFee?: number
  /** Every day that can't be booked: the owner's own blocked days plus accepted bookings. */
  blockedDates: ISODate[]
  /** Only the days the owner blocked themselves (for the edit form). Absent in mock data. */
  ownerBlockedDates?: ISODate[]
  rules: string[]
  ratingAvg: number
  ratingCount: number
  status: ListingStatus
  createdAt: ISODateTime
}

export interface PriceQuote {
  days: number
  dailyRate: number
  /** days × daily rate, before any weekly/monthly saving. */
  undiscountedSubtotal: number
  /** What the rent actually costs after the best weekly/monthly rate. */
  rentalSubtotal: number
  longStayDiscount: number
  serviceFee: number
  gstOnFee: number
  deliveryFee: number
  /** Rent + service fee + GST + delivery. Not refundable. */
  totalRent: number
  refundableDeposit: number
  /** totalRent + refundableDeposit: what the renter hands over at pickup. */
  totalDue: number
  /** What the owner keeps: rent after commission, plus any delivery fee. */
  ownerPayout: number
}

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'active' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'pay-at-pickup' | 'paid'

export interface Booking {
  id: string
  listingId: string
  renterId: string
  ownerId: string
  start: ISODate
  end: ISODate
  delivery: boolean
  quote: PriceQuote
  status: BookingStatus
  paymentStatus: PaymentStatus
  message?: string
  createdAt: ISODateTime
}

export interface Review {
  id: string
  listingId: string
  bookingId: string
  authorId: string
  targetUserId: string
  rating: 1 | 2 | 3 | 4 | 5
  text: string
  /** The author's role in the booking. */
  role: 'renter' | 'owner'
  createdAt: ISODateTime
}

export interface Conversation {
  id: string
  listingId: string
  participantIds: [string, string]
  lastMessageAt: ISODateTime
  lastMessagePreview: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  text: string
  sentAt: ISODateTime
  readAt?: ISODateTime
}

export interface FaqItem {
  id: string
  section: 'renting' | 'owning' | 'payments' | 'safety' | 'account'
  q: string
  a: string
}
