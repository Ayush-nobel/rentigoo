/**
 * Loads the Bhopal demo data into the sandbox backend through the real API:
 * every person signs up, creates their own profile and listings, and every
 * review comes from a real booking (request → accept → hand over → return).
 *
 * Run:  SEED_PASSWORD='<long random password>' npx ampx sandbox seed --identifier dev
 * The demo accounts use reserved example.com addresses; no emails are sent.
 */
import { readFileSync } from 'node:fs'
import { Amplify } from 'aws-amplify'
import { getCurrentUser, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import { createAndSignUpUser, signInUser } from '@aws-amplify/seed'
import { LEGAL } from '../../shared/legal'
import { addDays } from '../../shared/pricing'
import type { Listing } from '../../shared/types'
import { CONVERSATIONS, MESSAGES } from '../../src/data/activity'
import { LISTINGS } from '../../src/data/listings'
import { REVIEWS } from '../../src/data/reviews'
import { USERS } from '../../src/data/users'
import type { Schema } from '../data/resource'

const password = process.env.SEED_PASSWORD
if (!password || password.length < 12) throw new Error('Set SEED_PASSWORD (12+ characters) before seeding.')

Amplify.configure(JSON.parse(readFileSync('amplify_outputs.json', 'utf8')))
const client = generateClient<Schema>()
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

const emailFor = (seedId: string) => `${seedId.replace(/^u-/, '')}.demo@example.com`
const subs = new Map<string, string>() // seed user id → Cognito sub
const listingIds = new Map<string, string>() // seed listing id → real id
let signedInAs: string | null = null

function ok<T>(res: { data: T; errors?: { message: string }[] | null }, what: string): NonNullable<T> {
  if (res.errors?.length || !res.data) throw new Error(`${what}: ${res.errors?.map((e) => e.message).join('; ') ?? 'no data'}`)
  return res.data as NonNullable<T>
}

async function as(seedUserId: string) {
  if (signedInAs === seedUserId) return
  if (signedInAs) await signOut()
  const username = emailFor(seedUserId)
  if (!subs.has(seedUserId)) {
    try {
      await createAndSignUpUser({ username, password: password!, signInAfterCreation: true, signInFlow: 'Password', userAttributes: { email: username } })
    } catch (e) {
      if (!String((e as Error).name + (e as Error).message).includes('UsernameExists')) throw e
      await signInUser({ username, password: password!, signInFlow: 'Password' })
    }
    subs.set(seedUserId, (await getCurrentUser()).userId)
  } else {
    await signInUser({ username, password: password!, signInFlow: 'Password' })
  }
  signedInAs = seedUserId
}

async function main() {
  // 1. People and their listings
  for (const u of USERS) {
    await as(u.id)
    const sub = subs.get(u.id)!
    const existing = (await client.models.Listing.listListingsByOwner({ ownerId: sub })).data
    if (existing.length) {
      console.log(`Already seeded (${u.name} has listings). Delete the sandbox data to seed again.`)
      return
    }
    ok(await client.mutations.createMyProfile({ name: u.name, areaId: u.areaId, termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version }), `profile ${u.name}`)
    ok(await client.models.UserProfile.update({ id: sub, bio: u.bio, languages: u.languages } as never), `profile details ${u.name}`)
    for (const l of LISTINGS.filter((x) => x.ownerId === u.id)) {
      const created = ok(
        await client.models.Listing.create({
          ownerId: sub,
          title: l.title,
          description: l.description,
          categoryId: l.categoryId,
          areaId: l.areaId,
          photos: l.photos,
          condition: l.condition.replace('-', '_') as 'like_new',
          pricing: l.pricing,
          deposit: l.deposit,
          minDays: l.minDays,
          maxDays: l.maxDays,
          pickupOptions: l.pickupOptions,
          deliveryFee: l.deliveryFee ?? null,
          blockedDates: [],
          rules: l.rules,
          status: l.status,
        } as never),
        `listing ${l.title}`,
      )
      listingIds.set(l.id, created.id)
    }
    console.log(`✓ ${u.name}`)
  }

  // 2. Reviews, each earned through a full booking
  const listingBy = new Map(LISTINGS.map((l) => [l.id, l]))
  for (const r of REVIEWS) {
    const seedListing = listingBy.get(r.listingId) as Listing
    const realId = listingIds.get(r.listingId)!
    const start = addDays(today, 90)
    const end = addDays(start, Math.max(1, seedListing.minDays))
    await as(r.authorId)
    const booking = ok(await client.mutations.requestBooking({ listingId: realId, start, end, delivery: !seedListing.pickupOptions.includes('pickup') }), 'request')
    await as(seedListing.ownerId)
    for (const action of ['accept', 'handover', 'return'] as const) {
      ok(await client.mutations.respondToBooking({ bookingId: booking.id, action }), action)
    }
    await as(r.authorId)
    ok(await client.mutations.submitReview({ bookingId: booking.id, rating: r.rating, text: r.text }), 'review')
  }
  console.log(`✓ ${REVIEWS.length} reviews`)

  // 3. A few open bookings so dashboards aren't empty
  const open: [string, string, number, number, 'requested' | 'accepted', string?][] = [
    ['l-sony-a7iii', 'u-ananya', 18, 3, 'requested', 'Hi Priya! It’s for my brother’s engagement. A quick walkthrough would be great.'],
    ['l-jbl-partybox', 'u-ananya', 6, 1, 'accepted'],
    ['l-sleeping-bags', 'u-vikram', 20, 4, 'requested', 'Heading to Pachmarhi with a friend for the Dhoopgarh sunrise. Are both bags available?'],
    ['l-sleeping-bags', 'u-simran', 9, 3, 'accepted'],
  ]
  for (const [lid, renter, offset, days, status, message] of open) {
    const l = listingBy.get(lid)!
    await as(renter)
    const start = addDays(today, offset)
    const b = ok(
      await client.mutations.requestBooking({ listingId: listingIds.get(lid)!, start, end: addDays(start, days), delivery: false, message: message ?? null }),
      'open booking',
    )
    if (status === 'accepted') {
      await as(l.ownerId)
      ok(await client.mutations.respondToBooking({ bookingId: b.id, action: 'accept' }), 'accept')
    }
  }
  console.log('✓ open bookings')

  // 4. Conversations
  for (const c of CONVERSATIONS) {
    const [a, b] = c.participantIds
    await as(a)
    const convo = ok(
      await client.models.Conversation.create({
        listingId: listingIds.get(c.listingId)!,
        participantIds: [subs.get(a)!, subs.get(b)!],
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: '',
      }),
      'conversation',
    )
    for (const msg of MESSAGES.filter((x) => x.conversationId === c.id)) {
      await as(msg.senderId)
      const sentAt = new Date().toISOString()
      ok(
        await client.models.Message.create({ conversationId: convo.id, senderId: subs.get(msg.senderId)!, participantIds: convo.participantIds, text: msg.text, sentAt }),
        'message',
      )
      await client.models.Conversation.update({ id: convo.id, lastMessageAt: sentAt, lastMessagePreview: msg.text.slice(0, 140) })
    }
  }
  console.log('✓ conversations')
  if (signedInAs) await signOut()
  console.log(`\nDemo login: ${emailFor('u-ananya')} with your SEED_PASSWORD`)
}

await main()
