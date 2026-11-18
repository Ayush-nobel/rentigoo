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
// A real uploaded photo, so we can check the file is deleted too. Uploads go through a
// form the server signs for our own folder; the browser can't write to the bucket itself.
const photoBytes = readFileSync('public/brand/icon-192.png')
async function postPhoto(bytes: Uint8Array, fieldsOverride: Record<string, string> = {}) {
  const form = (await client.mutations.listingPhotoUpload({ ext: 'webp' })).data!
  const fields = { ...(typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields), ...fieldsOverride } as Record<string, string>
  const body = new FormData()
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  body.append('file', new Blob([bytes as BlobPart], { type: fields['Content-Type'] }))
  return { key: form.key, status: (await fetch(form.url, { method: 'POST', body })).status }
}
const uploaded = await postPhoto(photoBytes)
const photoKey = uploaded.key
report(uploaded.status === 204 && photoKey.startsWith(`listing-photos/${me}/`), 'Photo uploads through a signed form into our own folder', `${uploaded.status} ${photoKey}`)
const tooBig = await postPhoto(new Uint8Array(4 * 1024 * 1024))
report(tooBig.status === 400, 'S3 refuses an upload over the size limit', String(tooBig.status))
const asHtml = await postPhoto(photoBytes, { 'Content-Type': 'text/html' })
report(asHtml.status === 403, 'S3 refuses an upload with another file type', String(asHtml.status))
const direct = await uploadData({ path: ({ identityId }) => `listing-photos/${identityId}/${crypto.randomUUID()}.webp`, data: new Blob([photoBytes]) }).result.then(
  () => 'uploaded',
  () => 'refused',
)
report(direct === 'refused', 'Writing straight to the photo bucket is refused', direct)
const othersPhoto = await client.mutations.saveListing({
  listing: JSON.stringify({
    title: 'Someone else’s photo', description: 'Points at a photo in another person’s folder, which the server must refuse.', categoryId: 'tools', areaId: 'mp-nagar',
    photos: [{ key: 'listing-photos/someone-else/7c9e6679-7425-40de-944b-e07fc1f90ae7.webp', alt: 'Not mine' }], condition: 'good', pricing: { daily: 100 }, deposit: 0, minDays: 1, maxDays: 5, pickupOptions: ['pickup'], blockedDates: [], rules: [], status: 'draft',
  }),
})
report(!othersPhoto.data && /didn’t upload properly/.test(othersPhoto.errors?.[0]?.message ?? ''), 'A listing can’t use a photo from someone else’s folder', othersPhoto.errors?.[0]?.message)
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
const chat = await client.mutations.openConversation({ listingId: priyaListing.id, otherUserId: priyaListing.ownerId! })
const said = await client.mutations.sendMessage({ conversationId: chat.data!.id, text: 'My phone number is 98xxxxxx01, call me' })
report(!!listing.data && !!booking.data && !!said.data, 'Test account has a listing, a booking request with a note, and a message')

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
const theirWords = (await m.Message.listMessagesByConversation({ conversationId: chat.data!.id })).data
report(theirWords.length === 1 && !theirWords[0]!.text.includes('98xxxxxx01'), 'Their messages are wiped for the other person too', theirWords[0]?.text)
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
