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
  /** Typical monthly rent in rupees, used to prefill the calculators. */
  avgMonthlyRate: number
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

/** How a booking is measured: a range of days, or whole calendar months. */
export type RentalTerm = 'days' | 'months'

export interface ListingPricing {
  /** Per day. Absent on listings rented only by the month. */
  daily?: number
  /** Per 7 days, a discount on daily rentals. */
  weekly?: number
  /** Per month. Rents by the month when the listing has `months`. */
  monthly?: number
}

/** How many months a monthly rental can run for (1–12). */
export interface MonthRange {
  min: number
  max: number
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
  /** Shortest and longest rental by the day (only used when there's a daily price). */
  minDays: number
  maxDays: number
  /** Present when the listing can be rented by the month. */
  months?: MonthRange
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
  /** Days or months; absent on older bookings, which are all by the day. */
  term?: RentalTerm
  /** For monthly rentals: how many months, and the price per month. */
  months?: number
  monthlyRate?: number
  /** What's paid at pickup: the first month (or all the rent, by the day), any delivery fee and the deposit. */
  dueAtPickup?: number
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
  /** Monthly rentals: how many months the owner has marked as paid, in order. */
  paidMonths?: number
  /** Monthly rentals: when notice was given, and by whom. `end` moves to the notice end date. */
  notice?: { at: ISODateTime; by: string } | null
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
  /** The latest message, shortened. Filled in when conversations are listed. */
  lastMessagePreview: string
  /** The latest message is from the other person and you haven't seen it yet. */
  unread?: boolean
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

/** An owner's numbers for the dashboard. Rent counts once an item is marked returned. */
export interface OwnerStats {
  earnedThisMonth: number
  earnedTotal: number
  pendingRequests: number
  activeRentals: number
  upcomingRentals: number
}
