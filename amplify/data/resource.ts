import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import { createProfileFn } from '../functions/create-profile/resource'
import { deleteAccountFn } from '../functions/delete-account/resource'
import { ownerStatsFn } from '../functions/owner-stats/resource'
import { requestBookingFn } from '../functions/request-booking/resource'
import { saveListingFn } from '../functions/save-listing/resource'
import { messagesFn } from '../functions/messages/resource'
import { respondToBookingFn } from '../functions/respond-to-booking/resource'
import { submitReviewFn } from '../functions/submit-review/resource'

/**
 * Who can do what
 * - Anyone (signed in or not) can read listings, public profiles and reviews.
 * - Owners edit their own profile. Listings are created and edited only
 *   through saveListing, which checks them first; owners can read and delete theirs.
 * - Bookings are created and changed only by the booking functions, and read
 *   only by the renter and owner involved.
 * - Conversations and messages are visible only to their two participants,
 *   and written only by the messages function (so nobody can post as someone else).
 * - Fields the server maintains (ratings, verification, booked dates) are
 *   read-only for everyone; the functions write them with IAM access.
 */
// oxlint-disable-next-line typescript/no-explicit-any
const readOnlyForPeople = (allow: any) => [allow.guest().to(['read']), allow.authenticated().to(['read'])]
// oxlint-disable-next-line typescript/no-explicit-any
const ownerReadOnly = (allow: any) => [allow.ownerDefinedIn('userId').identityClaim('sub').to(['read'])]

const schema = a
  .schema({
    // ---------- shared shapes ----------
    Photo: a.customType({ key: a.string().required(), alt: a.string().required() }),
    ListingPricing: a.customType({ daily: a.integer().required(), weekly: a.integer(), monthly: a.integer() }),
    PriceQuote: a.customType({
      days: a.integer().required(),
      dailyRate: a.integer().required(),
      undiscountedSubtotal: a.integer().required(),
      rentalSubtotal: a.integer().required(),
      longStayDiscount: a.integer().required(),
      serviceFee: a.integer().required(),
      gstOnFee: a.integer().required(),
      deliveryFee: a.integer().required(),
      totalRent: a.integer().required(),
      refundableDeposit: a.integer().required(),
      totalDue: a.integer().required(),
      ownerPayout: a.integer().required(),
    }),
    Condition: a.enum(['new', 'like_new', 'good', 'fair']),
    ListingStatus: a.enum(['active', 'paused', 'draft']),
    BookingStatus: a.enum(['requested', 'accepted', 'declined', 'active', 'completed', 'cancelled']),
    PaymentStatus: a.enum(['unpaid', 'pay_at_pickup', 'paid']),
    ReviewRole: a.enum(['renter', 'owner']),
    BookingAction: a.enum(['accept', 'decline', 'cancel', 'handover', 'return']),
    OwnerStats: a.customType({
      earnedThisMonth: a.integer().required(),
      earnedTotal: a.integer().required(),
      pendingRequests: a.integer().required(),
      activeRentals: a.integer().required(),
      upcomingRentals: a.integer().required(),
    }),

    // ---------- people ----------
    UserProfile: a
      .model({
        id: a.id().required(), // the person's Cognito sub
        userId: a
          .string()
          .required() // same value, used for ownership; can't be handed to someone else
          .authorization((allow) => [
            allow.ownerDefinedIn('userId').identityClaim('sub').to(['read', 'create', 'delete']),
            allow.guest().to(['read']),
            allow.authenticated().to(['read']),
          ]),
        // Full name: only the person themselves can see it. Everyone else sees displayName.
        // Optional at the database level (Amplify requires that for private fields);
        // createMyProfile always sets it, after validating it.
        name: a
          .string()
          .authorization((allow) => [allow.ownerDefinedIn('userId').identityClaim('sub').to(['read', 'update'])]),
        displayName: a.string().authorization(readOnlyForPeople), // "Meera J.", set by the server
        avatarKey: a.string(),
        areaId: a.string().required(),
        // Consent record (DPDP Act): which documents they agreed to, and when. Private.
        termsVersion: a.string().authorization(ownerReadOnly),
        privacyVersion: a.string().authorization(ownerReadOnly),
        consentAt: a.datetime().authorization(ownerReadOnly),
        bio: a.string(),
        languages: a.string().array(),
        verifiedEmail: a.boolean().authorization(readOnlyForPeople),
        verifiedPhone: a.boolean().authorization(readOnlyForPeople),
        verifiedGovtId: a.boolean().authorization(readOnlyForPeople),
        responseRate: a.integer().authorization(readOnlyForPeople),
        responseTimeHrs: a.integer().authorization(readOnlyForPeople),
        ratingAvg: a.float().authorization(readOnlyForPeople),
        ratingCount: a.integer().authorization(readOnlyForPeople),
      })
      .authorization((allow) => [
        // Created only through createMyProfile, so the server checks it first.
        allow.ownerDefinedIn('userId').identityClaim('sub').to(['read', 'update', 'delete']),
        allow.guest().to(['read']),
        allow.authenticated().to(['read']),
      ]),

    // ---------- listings ----------
    Listing: a
      .model({
        ownerId: a
          .string()
          .authorization((allow) => [
            allow.ownerDefinedIn('ownerId').identityClaim('sub').to(['read', 'delete']),
            allow.guest().to(['read']),
            allow.authenticated().to(['read']),
          ]),
        title: a.string().required(),
        description: a.string().required(),
        categoryId: a.string().required(),
        areaId: a.string().required(),
        photos: a.ref('Photo').required().array().required(),
        condition: a.ref('Condition').required(),
        pricing: a.ref('ListingPricing').required(),
        deposit: a.integer().required(),
        minDays: a.integer().required(),
        maxDays: a.integer().required(),
        pickupOptions: a.string().required().array().required(),
        deliveryFee: a.integer(),
        blockedDates: a.string().required().array(), // days the owner keeps for themselves
        bookedDates: a.string().array().authorization(readOnlyForPeople), // maintained by the booking functions
        rules: a.string().required().array(),
        ratingAvg: a.float().authorization(readOnlyForPeople),
        ratingCount: a.integer().authorization(readOnlyForPeople),
        status: a.ref('ListingStatus').required(),
      })
      .secondaryIndexes((index) => [index('ownerId').queryField('listListingsByOwner')])
      .authorization((allow) => [
        allow.ownerDefinedIn('ownerId').identityClaim('sub').to(['read', 'delete']),
        allow.guest().to(['read']),
        allow.authenticated().to(['read']),
      ]),

    // ---------- bookings (written only by functions) ----------
    Booking: a
      .model({
        listingId: a.string().required(),
        renterId: a.string().required(),
        ownerId: a.string().required(),
        participants: a.string().required().array().required(),
        start: a.date().required(),
        end: a.date().required(),
        delivery: a.boolean().required(),
        quote: a.ref('PriceQuote').required(),
        status: a.ref('BookingStatus').required(),
        paymentStatus: a.ref('PaymentStatus').required(),
        message: a.string(),
      })
      .secondaryIndexes((index) => [
        index('listingId').queryField('listBookingsByListing'),
        index('renterId').queryField('listBookingsByRenter'),
        index('ownerId').queryField('listBookingsByOwner'),
      ])
      .authorization((allow) => [allow.ownersDefinedIn('participants').identityClaim('sub').to(['read'])]),

    Review: a
      .model({
        listingId: a.string().required(),
        bookingId: a.string().required(),
        authorId: a.string().required(),
        targetUserId: a.string().required(),
        rating: a.integer().required(),
        text: a.string().required(),
        role: a.ref('ReviewRole').required(),
      })
      .secondaryIndexes((index) => [
        index('listingId').queryField('listReviewsByListing'),
        index('targetUserId').queryField('listReviewsByTarget'),
        index('bookingId').queryField('listReviewsByBooking'),
        index('authorId').queryField('listReviewsByAuthor'),
      ])
      .authorization((allow) => [allow.guest().to(['read']), allow.authenticated().to(['read'])]),

    // ---------- messages ----------
    // Written only by the messages function, which sets the sender itself.
    Conversation: a
      .model({
        listingId: a.string().required(),
        participantIds: a.string().required().array().required(),
        lastMessageAt: a.datetime().required(),
        lastSenderId: a.string(),
        readBy: a.string().required().array(), // who has seen the latest message
      })
      .secondaryIndexes((index) => [index('listingId').queryField('listConversationsByListing')])
      .authorization((allow) => [allow.ownersDefinedIn('participantIds').identityClaim('sub').to(['read'])]),

    Message: a
      .model({
        conversationId: a.string().required(),
        senderId: a.string().required(),
        participantIds: a.string().required().array().required(),
        text: a.string().required(),
        sentAt: a.datetime().required(),
        readAt: a.datetime(),
      })
      .secondaryIndexes((index) => [
        index('conversationId').sortKeys(['sentAt']).queryField('listMessagesByConversation'),
        index('senderId').queryField('listMessagesBySender'),
      ])
      .authorization((allow) => [allow.ownersDefinedIn('participantIds').identityClaim('sub').to(['read'])]),

    openConversation: a
      .mutation()
      .arguments({ listingId: a.string().required(), otherUserId: a.string().required() })
      .returns(a.ref('Conversation'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(messagesFn)),

    sendMessage: a
      .mutation()
      .arguments({ conversationId: a.string().required(), text: a.string().required() })
      .returns(a.ref('Message'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(messagesFn)),

    markConversationRead: a
      .mutation()
      .arguments({ conversationId: a.string().required() })
      .returns(a.integer())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(messagesFn)),

    // ---------- server-side operations ----------
    requestBooking: a
      .mutation()
      .arguments({
        listingId: a.string().required(),
        start: a.date().required(),
        end: a.date().required(),
        delivery: a.boolean().required(),
        message: a.string(),
      })
      .returns(a.ref('Booking'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(requestBookingFn)),

    respondToBooking: a
      .mutation()
      .arguments({ bookingId: a.string().required(), action: a.ref('BookingAction').required() })
      .returns(a.ref('Booking'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(respondToBookingFn)),

    // Creates a listing (no id) or edits one (id; send only the fields that change).
    // `listing` is checked against shared/listingRules before anything is stored.
    saveListing: a
      .mutation()
      .arguments({ id: a.id(), listing: a.json().required() })
      .returns(a.ref('Listing'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(saveListingFn)),

    // Deletes the caller's listing and its photos (refused while it's booked).
    deleteMyListing: a
      .mutation()
      .arguments({ id: a.id().required() })
      .returns(a.customType({ declinedRequests: a.integer().required() }))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(saveListingFn)),

    submitReview: a
      .mutation()
      .arguments({ bookingId: a.string().required(), rating: a.integer().required(), text: a.string().required() })
      .returns(a.ref('Review'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(submitReviewFn)),

    createMyProfile: a
      .mutation()
      .arguments({
        name: a.string().required(),
        areaId: a.string().required(),
        termsVersion: a.string().required(),
        privacyVersion: a.string().required(),
      })
      .returns(a.ref('UserProfile'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(createProfileFn)),

    DeletionSummary: a.customType({
      cancelledBookings: a.integer().required(),
      deletedListings: a.integer().required(),
      deletedReviews: a.integer().required(),
      redactedMessages: a.integer().required(),
    }),

    deleteMyAccount: a
      .mutation()
      .returns(a.ref('DeletionSummary'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(deleteAccountFn)),

    ownerStats: a
      .query()
      .returns(a.ref('OwnerStats'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(ownerStatsFn)),
  })
  // The functions read and write models with IAM, bypassing the per-person rules above.
  .authorization((allow) => [allow.resource(createProfileFn), allow.resource(deleteAccountFn), allow.resource(requestBookingFn), allow.resource(respondToBookingFn), allow.resource(submitReviewFn), allow.resource(ownerStatsFn), allow.resource(saveListingFn), allow.resource(messagesFn)])

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
