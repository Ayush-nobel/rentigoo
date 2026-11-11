/**
 * Tries things people must NOT be able to do against the deployed sandbox,
 * and a few they must. Run after seeding:
 *   set -a; . ./.env.seed; set +a; npx tsx scripts/check-access.ts
 */
import { readFileSync } from 'node:fs'
import { Amplify } from 'aws-amplify'
import { getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'

const password = process.env.SEED_PASSWORD
if (!password) throw new Error('Set SEED_PASSWORD (see .env.seed)')
Amplify.configure(JSON.parse(readFileSync('amplify_outputs.json', 'utf8')))
const client = generateClient<Schema>()
const m = client.models

let pass = 0
let fail = 0
function report(ok: boolean, label: string, detail = '') {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}
type Res = { data?: unknown; errors?: { message: string }[] | null }
const refused = (r: Res) => Boolean(r.errors?.length) || r.data == null
const firstError = (r: Res) => r.errors?.[0]?.message?.slice(0, 90) ?? ''

async function as(name: string) {
  await signOut().catch(() => {})
  await signIn({ username: `${name}.demo@example.com`, password: password! })
  return (await getCurrentUser()).userId
}

// --- signed out ---
await signOut().catch(() => {})
const listings = (await m.Listing.list({ authMode: 'identityPool' })).data
report(listings.length >= 23, 'Guest can read listings', `${listings.length} found`)
const guestBookings = await m.Booking.list({ authMode: 'identityPool' }).catch((e) => ({ errors: [{ message: String(e) }], data: null }))
report(refused(guestBookings as Res) || (guestBookings as { data: unknown[] }).data.length === 0, 'Guest cannot read bookings')

const priyaListing = listings.find((l) => l.title.startsWith('Sony A7 III'))!

// --- Ananya (renter) ---
const ananya = await as('ananya')
const hijack = await m.Listing.update({ id: priyaListing.id, title: 'Free camera!' } as never)
report(refused(hijack), 'Cannot edit someone else’s listing', firstError(hijack))

const fakeRating = await m.UserProfile.update({ id: ananya, ratingAvg: 5, ratingCount: 999 } as never)
report(refused(fakeRating), 'Cannot give yourself a rating', firstError(fakeRating))

const myBookingsRaw = await m.Booking.list()
report(
  myBookingsRaw.data.every((b) => (b.participants ?? []).includes(ananya)),
  'Only sees bookings she is part of',
  `${myBookingsRaw.data.length} visible`,
)

const forged = await m.Booking.create({
  listingId: priyaListing.id,
  renterId: ananya,
  ownerId: priyaListing.ownerId!,
  participants: [ananya, priyaListing.ownerId!],
  start: '2027-01-01',
  end: '2027-01-02',
  delivery: false,
  quote: { days: 1, dailyRate: 1, undiscountedSubtotal: 1, rentalSubtotal: 1, longStayDiscount: 0, serviceFee: 0, gstOnFee: 0, deliveryFee: 0, totalRent: 1, refundableDeposit: 0, totalDue: 1, ownerPayout: 1 },
  status: 'accepted',
  paymentStatus: 'paid',
} as never)
report(refused(forged), 'Cannot write a booking directly (must go through the server)', firstError(forged))

const pastDates = await client.mutations.requestBooking({ listingId: priyaListing.id, start: '2020-01-01', end: '2020-01-03', delivery: false })
report(refused(pastDates) && /passed/.test(firstError(pastDates)), 'Server refuses past dates with a readable reason', firstError(pastDates))

const selfAccept = myBookingsRaw.data.find((b) => b.renterId === ananya && b.status === 'requested')
if (selfAccept) {
  const r = await client.mutations.respondToBooking({ bookingId: selfAccept.id, action: 'accept' })
  report(refused(r), 'Renter cannot accept her own request', firstError(r))
}

const mine = (await m.Listing.listListingsByOwner({ ownerId: ananya })).data[0]!
const giveAway = await m.Listing.update({ id: mine.id, ownerId: priyaListing.ownerId } as never)
report(refused(giveAway), 'Cannot hand a listing to someone else', firstError(giveAway))

const ownBooked = await m.Listing.update({ id: mine.id, bookedDates: ['2026-12-25'] } as never)
report(refused(ownBooked), 'Cannot fake booked dates', firstError(ownBooked))

const directEdit = await m.Listing.update({ id: mine.id, title: mine.title } as never)
report(refused(directEdit), 'Cannot edit a listing directly (must go through the server check)', firstError(directEdit))

const directCreate = await m.Listing.create({
  title: 'Unchecked listing', description: 'x', categoryId: 'tools', areaId: 'mp-nagar', photos: [], condition: 'good',
  pricing: { daily: 1 }, deposit: 0, minDays: 1, maxDays: 1, pickupOptions: ['pickup'], blockedDates: [], rules: [], status: 'active',
} as never)
report(refused(directCreate), 'Cannot create a listing directly', firstError(directCreate))

const allowedEdit = await client.mutations.saveListing({ id: mine.id, listing: JSON.stringify({ title: mine.title }) })
report(!refused(allowedEdit) && allowedEdit.data?.title === mine.title, 'Can edit her own listing through saveListing', firstError(allowedEdit))

const editOthers = await client.mutations.saveListing({ id: priyaListing.id, listing: JSON.stringify({ title: 'Free camera!' }) })
report(refused(editOthers), 'Cannot edit someone else’s listing through saveListing', firstError(editOthers))

const sneaky = await client.mutations.saveListing({ id: mine.id, listing: JSON.stringify({ ownerId: priyaListing.ownerId, ratingAvg: 5, bookedDates: ['2026-12-25'] }) })
report(!refused(sneaky) && sneaky.data?.ownerId === ananya && (sneaky.data?.ratingAvg ?? 0) === (mine.ratingAvg ?? 0) && !(sneaky.data?.bookedDates ?? []).includes('2026-12-25'), 'saveListing ignores owner, rating and booked days', firstError(sneaky) ?? JSON.stringify({ owner: sneaky.data?.ownerId === ananya, r: [sneaky.data?.ratingAvg, mine.ratingAvg], b: sneaky.data?.bookedDates }))

const foreignPhoto = await client.mutations.saveListing({ id: mine.id, listing: JSON.stringify({ photos: [{ key: 'https://example.com/x.jpg', alt: 'A photo' }] }) })
report(refused(foreignPhoto), 'Cannot point a listing at a photo from another website', firstError(foreignPhoto))

const reviewForNothing = await client.mutations.submitReview({ bookingId: selfAccept?.id ?? 'nope', rating: 5, text: 'Five stars for a rental that never happened' })
report(refused(reviewForNothing), 'Cannot review a rental that didn’t happen', firstError(reviewForNothing))

const directProfile = await m.UserProfile.create({ id: 'someone-else', userId: ananya, name: 'Fake', areaId: 'mp-nagar' } as never)
report(refused(directProfile), 'Cannot create a profile directly (must go through the server)', firstError(directProfile))

const again = await client.mutations.createMyProfile({ name: 'Different Name', areaId: 'mp-nagar', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
report(!refused(again) && again.data?.name === 'Ananya Gupta', 'Creating a profile twice returns the existing one', again.data?.name ?? firstError(again))
// Seeded demo accounts were created by an admin with unverified example.com
// emails, so Cognito says "not verified" and the server must agree.
report(!again.data?.verifiedEmail, 'Email badge follows Cognito (seeded emails are unverified)', `verifiedEmail=${again.data?.verifiedEmail}`)

const badName = await client.mutations.createMyProfile({ name: '<script>', areaId: 'nowhere', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
report(!refused(badName), 'Existing profile is unaffected by junk input', badName.data?.name ?? firstError(badName))

// Messages go through the server, which sets the sender.
const convo = await client.mutations.openConversation({ listingId: priyaListing.id, otherUserId: priyaListing.ownerId! })
report(!refused(convo) && !!convo.data, 'Can start a conversation with a listing’s owner', firstError(convo))
const spoof = await m.Message.create({ conversationId: convo.data!.id, senderId: priyaListing.ownerId, participantIds: convo.data!.participantIds, text: 'Pay me in advance', sentAt: new Date().toISOString() } as never)
report(refused(spoof), 'Cannot write a message directly (or as someone else)', firstError(spoof))
const sent = await client.mutations.sendMessage({ conversationId: convo.data!.id, text: 'Access check: is it free next month?' })
report(!refused(sent) && sent.data?.senderId === ananya, 'Messages sent through the server are from the sender', firstError(sent) ?? sent.data?.senderId)
const editMsg = await m.Message.update({ id: sent.data!.id, text: 'Edited' } as never)
report(refused(editMsg), 'Cannot edit a message after sending', firstError(editMsg))
const strangerChat = await client.mutations.openConversation({ listingId: priyaListing.id, otherUserId: 'someone-who-is-not-the-owner' })
report(refused(strangerChat), 'Cannot use a listing to start chats with people who don’t own it', firstError(strangerChat))
const directConvo = await m.Conversation.create({ listingId: priyaListing.id, participantIds: [ananya, priyaListing.ownerId], lastMessageAt: new Date().toISOString() } as never)
report(refused(directConvo), 'Cannot create a conversation directly', firstError(directConvo))
const notMine = await client.mutations.sendMessage({ conversationId: 'not-a-real-conversation', text: 'hello there' })
report(refused(notMine), 'Cannot post into a conversation you’re not in', firstError(notMine))

// --- Neha (not part of Ananya's conversations) ---
await as('neha')
const others = (await m.Conversation.list()).data
const theirMessages = (await m.Message.list()).data
report(theirMessages.length === 0, 'Cannot read other people’s messages', `${theirMessages.length} visible`)
report(others.length === 0, 'Cannot see other people’s conversations', `${others.length} visible`)

await signOut()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
