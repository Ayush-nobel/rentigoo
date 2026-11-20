import { a, defineData, type ClientSchema } from '@aws-amplify/backend'
import { createProfileFn } from '../functions/create-profile/resource'
import { deleteAccountFn } from '../functions/delete-account/resource'
import { ownerStatsFn } from '../functions/owner-stats/resource'
import { requestBookingFn } from '../functions/request-booking/resource'
import { saveListingFn } from '../functions/save-listing/resource'
import { messagesFn } from '../functions/messages/resource'
import { phoneCheckFn } from '../functions/phone-check/resource'
import { respondToBookingFn } from '../functions/respond-to-booking/resource'
import { submitReviewFn } from '../functions/submit-review/resource'
import { conditionReportsFn } from '../functions/condition-reports/resource'
import { idCheckFn } from '../functions/id-check/resource'
import { bookingFeeFn } from '../functions/booking-fee/resource'
import { feeRefundsFn } from '../functions/fee-refunds/resource'
import { purgeConditionReportsFn } from '../functions/purge-condition-reports/resource'

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
// For tables only the functions use: Amplify needs a rule on every model, so
// these name a user group that nobody is ever put in. Functions bypass it (IAM).
// oxlint-disable-next-line typescript/no-explicit-any
const functionsOnly = (allow: any) => [allow.group('functions-only-no-members')]
// oxlint-disable-next-line typescript/no-explicit-any
const ownerReadOnly = (allow: any) => [allow.ownerDefinedIn('userId').identityClaim('sub').to(['read'])]

const schema = a
  .schema({
    // ---------- shared shapes ----------
    Photo: a.customType({ key: a.string().required(), alt: a.string().required() }),
    ListingPricing: a.customType({ daily: a.integer(), weekly: a.integer(), monthly: a.integer() }), // daily is absent on monthly-only listings
    MonthRange: a.customType({ min: a.integer().required(), max: a.integer().required() }),
    Notice: a.customType({ at: a.datetime().required(), by: a.string().required() }),
    PriceQuote: a.customType({
      term: a.string(), // 'days' | 'months'; absent on older bookings (all by the day)
      months: a.integer(),
      monthlyRate: a.integer(),
      dueAtPickup: a.integer(),
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
    BookingAction: a.enum(['accept', 'decline', 'cancel', 'handover', 'return', 'markPaid', 'giveNotice']),
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
        months: a.ref('MonthRange'), // present when it can be rented by the month
        pickupOptions: a.string().required().array().required(),
        deliveryFee: a.integer(),
        blockedDates: a.string().required().array(), // days the owner keeps for themselves
        bookedDates: a.string().array().authorization(readOnlyForPeople), // maintained by the booking functions
        rules: a.string().required().array(),
        itemValue: a.integer(), // what it cost new; sets the deposit limit
        hasReceipt: a.boolean().authorization(readOnlyForPeople), // the bill itself is in ListingReceipt, private
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

    // Which file is a listing's original bill (id = the listing's id). Only the
    // functions can read it; the file itself is private in listing-receipts/<owner>/.
    ListingReceipt: a
      .model({ ownerId: a.string().required(), key: a.string().required() })
      .secondaryIndexes((index) => [index('ownerId').queryField('listListingReceiptsByOwner')])
      .authorization(functionsOnly),

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
        paidMonths: a.integer(), // monthly rentals: months the owner has marked paid
        notice: a.ref('Notice'), // monthly rentals: notice to end early
        // The booking fee (online, after acceptance), written by the booking functions only.
        feeStatus: a.string(), // 'due' | 'paid' | 'refund_due' | 'refunded'
        feeAmount: a.integer(),
        feePaidAt: a.datetime(),
        feeLinkId: a.string(),
        feeLinkUrl: a.string(),
        feePaymentId: a.string(),
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

    // ---------- phone checks (only the phone-check function can read or write these) ----------
    // Keyed by account. Holds fingerprints (HMAC) and a hashed code, never the number or the code.
    PhoneCheck: a.model({
      verifiedHash: a.string(),
      pendingHash: a.string(),
      codeHash: a.string(),
      expiresAt: a.datetime(),
      attempts: a.integer().required(),
      sendDay: a.string().required(),
      sendsToday: a.integer().required(),
      lastSentAt: a.datetime(),
    }).authorization(functionsOnly),
    // Keyed by the number's fingerprint: which account checked it (one number, one account).
    PhoneClaim: a.model({ userId: a.string().required() }).authorization(functionsOnly),
    // Codes sent to a number per day (abuse limit). Deleted automatically after two days.
    PhoneSendCount: a.model({ count: a.integer().required(), ttl: a.integer().required() }).authorization(functionsOnly),

    PhoneStatus: a.customType({ available: a.boolean().required(), verified: a.boolean().required() }),
    PhoneStart: a.customType({ sentTo: a.string().required(), resendInSeconds: a.integer().required() }),
    phoneStatus: a.query().returns(a.ref('PhoneStatus')).authorization((allow) => [allow.authenticated()]).handler(a.handler.function(phoneCheckFn)),
    startPhoneCheck: a
      .mutation()
      .arguments({ phone: a.string().required() })
      .returns(a.ref('PhoneStart'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(phoneCheckFn)),
    confirmPhoneCheck: a
      .mutation()
      .arguments({ code: a.string().required() })
      .returns(a.ref('PhoneStatus'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(phoneCheckFn)),
    forgetPhone: a.mutation().returns(a.ref('PhoneStatus')).authorization((allow) => [allow.authenticated()]).handler(a.handler.function(phoneCheckFn)),

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
        months: a.integer(), // set for a monthly rental; the end date is worked out from it
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
    // ---------- booking fee (online, after the owner accepts) ----------
    FeeResult: a.customType({ paid: a.boolean().required() }),
    FeeStart: a.customType({ url: a.string().required() }),
    startBookingFee: a
      .mutation()
      .arguments({ bookingId: a.string().required(), returnUrl: a.string().required() })
      .returns(a.ref('FeeStart'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingFeeFn)),
    confirmBookingFee: a
      .mutation()
      .arguments({ bookingId: a.string().required(), params: a.json().required() })
      .returns(a.ref('FeeResult'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(bookingFeeFn)),

    // ---------- ID checks (only the id-check function reads or writes these) ----------
    // Keyed by account: a pending DigiLocker request, and the fingerprint of the checked ID. Never the ID details.
    IdCheck: a.model({ pendingRequestId: a.string(), verifiedHash: a.string(), verifiedAt: a.datetime() }).authorization(functionsOnly),
    // Keyed by the ID's fingerprint: which account checked it (one ID, one account).
    IdClaim: a.model({ userId: a.string().required() }).authorization(functionsOnly),
    IdStatus: a.customType({ available: a.boolean().required(), verified: a.boolean().required() }),
    IdStart: a.customType({ url: a.string().required() }),
    idCheckStatus: a.query().returns(a.ref('IdStatus')).authorization((allow) => [allow.authenticated()]).handler(a.handler.function(idCheckFn)),
    startIdCheck: a
      .mutation()
      .arguments({ returnUrl: a.string().required() })
      .returns(a.ref('IdStart'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(idCheckFn)),
    finishIdCheck: a
      .mutation()
      .arguments({ requestId: a.string().required() })
      .returns(a.ref('IdStatus'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(idCheckFn)),
    forgetIdCheck: a.mutation().returns(a.ref('IdStatus')).authorization((allow) => [allow.authenticated()]).handler(a.handler.function(idCheckFn)),

    // ---------- pickup and return checks (only the condition-reports function reads or writes these) ----------
    // One per person per stage per booking. Photos are private keys under condition-photos/<author>/.
    ConditionReport: a
      .model({
        bookingId: a.string().required(),
        stage: a.string().required(),
        authorId: a.string().required(),
        checks: a.json().required(),
        notes: a.string().required(),
        photoKeys: a.string().required().array().required(),
        recordedAt: a.datetime().required(),
      })
      .secondaryIndexes((index) => [index('bookingId').queryField('listConditionReportsByBooking'), index('authorId').queryField('listConditionReportsByAuthor')])
      .authorization(functionsOnly),
    ConditionPhoto: a.customType({ key: a.string().required(), url: a.string().required() }),
    ConditionReportView: a.customType({
      id: a.string().required(),
      bookingId: a.string().required(),
      stage: a.string().required(),
      authorId: a.string().required(),
      checks: a.json().required(),
      notes: a.string().required(),
      photos: a.ref('ConditionPhoto').required().array().required(),
      createdAt: a.string().required(),
    }),
    conditionPhotoUpload: a
      .mutation()
      .arguments({ bookingId: a.string().required(), ext: a.string().required() })
      .returns(a.ref('ListingPhotoUpload'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(conditionReportsFn)),
    saveConditionReport: a
      .mutation()
      .arguments({ bookingId: a.string().required(), stage: a.string().required(), checks: a.json().required(), notes: a.string().required(), photoKeys: a.string().required().array().required() })
      .returns(a.ref('ConditionReportView'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(conditionReportsFn)),
    bookingConditionReports: a
      .query()
      .arguments({ bookingId: a.string().required() })
      .returns(a.ref('ConditionReportView').array())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(conditionReportsFn)),

    // Listing photos: the browser can't write to storage itself; it gets a signed form
    // for one small image in its own folder, and asks here to delete unused uploads.
    ListingPhotoUpload: a.customType({ key: a.string().required(), url: a.string().required(), fields: a.json().required() }),
    listingPhotoUpload: a
      .mutation()
      .arguments({ ext: a.string().required() })
      .returns(a.ref('ListingPhotoUpload'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(saveListingFn)),
    // The original bill for an item that cost more than ₹5,000: a photo or a PDF, private.
    listingReceiptUpload: a
      .mutation()
      .arguments({ ext: a.string().required() })
      .returns(a.ref('ListingPhotoUpload'))
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(saveListingFn)),
    discardListingPhotos: a
      .mutation()
      .arguments({ keys: a.string().required().array().required() })
      .returns(a.boolean())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(saveListingFn)),
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
  .authorization((allow) => [allow.resource(createProfileFn), allow.resource(deleteAccountFn), allow.resource(requestBookingFn), allow.resource(respondToBookingFn), allow.resource(submitReviewFn), allow.resource(ownerStatsFn), allow.resource(saveListingFn), allow.resource(messagesFn), allow.resource(phoneCheckFn), allow.resource(conditionReportsFn), allow.resource(purgeConditionReportsFn), allow.resource(idCheckFn), allow.resource(bookingFeeFn), allow.resource(feeRefundsFn)])

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
