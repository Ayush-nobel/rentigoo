/**
 * End-to-end check of "Delete my account" against the sandbox:
 * makes a throwaway account, gives it data, deletes it, and checks every
 * promise on the Account page. No email is sent (admin-created user).
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/check-delete.ts
 */
import { readFileSync } from 'node:fs'
import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Amplify } from 'aws-amplify'
import { confirmSignIn, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import { uploadData } from 'aws-amplify/storage'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'
import { addDays } from '../shared/pricing'

const seedPassword = process.env.SEED_PASSWORD
if (!seedPassword) throw new Error('Set SEED_PASSWORD (see .env.seed)')
const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'))
Amplify.configure(outputs)
const client = generateClient<Schema>()
const m = client.models

let pass = 0
let fail = 0
const report = (ok: boolean, label: string, detail = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

// 1. A throwaway account (admin-created, so no email goes out).
const email = `delete-check-${Date.now()}@example.com`
const password = `Del-${Math.random().toString(36).slice(2)}A9!`
await new CognitoIdentityProviderClient({ region: outputs.auth.aws_region }).send(
  new AdminCreateUserCommand({
    UserPoolId: outputs.auth.user_pool_id,
    Username: email,
    TemporaryPassword: password,
    MessageAction: 'SUPPRESS',
    UserAttributes: [{ Name: 'email', Value: email }],
  }),
)
await signOut().catch(() => {})
const first = await signIn({ username: email, password })
if (first.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') await confirmSignIn({ challengeResponse: password })
const me = (await getCurrentUser()).userId

// 2. Give it data: profile, a listing, and a request with a note on someone else's item.
const profile = await client.mutations.createMyProfile({ name: 'Delete Check', areaId: 'mp-nagar', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
report(profile.data?.displayName === 'Delete C.', 'Profile created with a public name', profile.data?.displayName ?? profile.errors?.[0]?.message)
const stored = (await m.UserProfile.get({ id: me })).data
report(
  stored?.consentAt != null && stored?.termsVersion === LEGAL.terms.version && stored?.privacyVersion === LEGAL.privacy.version,
  'Consent record is stored (versions and time)',
  `${stored?.termsVersion} / ${stored?.privacyVersion} at ${stored?.consentAt}`,
)
// A real uploaded photo, so we can check the file is deleted too.
const photoBytes = readFileSync('public/brand/icon-192.png')
const { path: photoKey } = await uploadData({
  path: ({ identityId }) => `listing-photos/${identityId}/${crypto.randomUUID()}.webp`,
  data: new Blob([photoBytes], { type: 'image/webp' }),
  options: { contentType: 'image/webp' },
}).result
const photoUrl = `https://${outputs.storage.bucket_name}.s3.${outputs.storage.aws_region}.amazonaws.com/${photoKey}`
report((await fetch(photoUrl)).status === 200, 'Uploaded listing photo is public', photoKey)
const listing = await client.mutations.saveListing({
  listing: JSON.stringify({
    title: 'Delete-check ladder', description: 'Aluminium step ladder, six steps, folds flat. Test item for the deletion check.', categoryId: 'tools', areaId: 'mp-nagar',
    photos: [{ key: photoKey, alt: 'Silver step ladder' }], condition: 'good', pricing: { daily: 100 }, deposit: 0, minDays: 1, maxDays: 5, pickupOptions: ['pickup'], blockedDates: [], rules: [], status: 'active',
  }),
})
const priyaListing = (await m.Listing.list({ filter: { title: { beginsWith: 'Canon EF 50mm' } } })).data[0]!
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const start = addDays(today, 200)
const booking = await client.mutations.requestBooking({ listingId: priyaListing.id, start, end: addDays(start, 2), delivery: false, message: 'Private note that must be wiped' })
report(!!listing.data && !!booking.data, 'Test account has a listing and a booking request with a note')

// 3. Delete.
const summary = await client.mutations.deleteMyAccount()
report(!summary.errors?.length && summary.data?.deletedListings === 1 && summary.data?.cancelledBookings === 1, 'Delete my account succeeds', JSON.stringify(summary.data ?? summary.errors?.[0]?.message))
await signOut().catch(() => {})

// 4. Check the promises.
const gone = await m.UserProfile.get({ id: me }, { authMode: 'identityPool', selectionSet: ['id', 'displayName'] } as never)
report(gone.data == null, 'Profile is gone')
const listingGone = await m.Listing.get({ id: listing.data!.id }, { authMode: 'identityPool' })
report(listingGone.data == null, 'Listing is gone')
const photoAfter = (await fetch(photoUrl)).status
report(photoAfter === 403 || photoAfter === 404, 'Listing photo file is deleted', String(photoAfter))
const relogin = await signIn({ username: email, password }).then(() => 'signed in', (e) => (e as Error).name)
report(relogin !== 'signed in', 'Login no longer works', relogin)
await signOut().catch(() => {})

await signIn({ username: 'priya.demo@example.com', password: seedPassword })
const record = (await m.Booking.get({ id: booking.data!.id })).data
report(record?.status === 'cancelled', 'Open request was cancelled', record?.status ?? 'not visible')
report(record != null && !record.message, 'The note was wiped from the booking record the owner keeps', String(record?.message))

// 5. Full names and consent records stay private.
const ananyaId = (await m.Listing.list({ filter: { title: { beginsWith: 'Two sleeping bags' } } })).data[0]!.ownerId!
const peek = await m.UserProfile.get({ id: ananyaId }, { selectionSet: ['id', 'name', 'consentAt'] } as never)
report(peek.errors?.some((e) => /Not Authorized|Unauthorized/i.test(e.message)) === true, 'Another member can’t read someone’s full name or consent record', peek.errors?.[0]?.message.slice(0, 70))
const publicView = await m.UserProfile.get({ id: ananyaId }, { selectionSet: ['id', 'displayName'] } as never)
report((publicView.data as { displayName?: string } | null)?.displayName === 'Ananya G.', 'Public name is visible', (publicView.data as { displayName?: string } | null)?.displayName)
await signOut()

const guestPeek = await m.UserProfile.get({ id: ananyaId }, { authMode: 'identityPool', selectionSet: ['id', 'name'] } as never)
report(guestPeek.errors?.length ? true : false, 'A visitor can’t read full names', guestPeek.errors?.[0]?.message.slice(0, 70))

await signIn({ username: 'ananya.demo@example.com', password: seedPassword })
const own = await m.UserProfile.get({ id: ananyaId })
report(own.data?.name === 'Ananya Gupta', 'You can read your own full name', own.data?.name ?? own.errors?.[0]?.message)
await signOut()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
