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

const allowedEdit = await m.Listing.update({ id: mine.id, title: mine.title } as never)
report(!refused(allowedEdit), 'Can edit her own listing', firstError(allowedEdit))

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

// --- Neha (not part of Ananya's conversations) ---
await as('neha')
const others = (await m.Conversation.list()).data
report(others.length === 0, 'Cannot see other people’s conversations', `${others.length} visible`)

await signOut()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
