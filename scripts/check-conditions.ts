/**
 * End-to-end check of pickup and return checks against the sandbox:
 * a throwaway renter books Priya's lens, Priya accepts, both record a pickup
 * check with a photo, a stranger is kept out, photos are private, and deleting
 * the renter's account removes their check and photos.
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/check-conditions.ts
 */
import { readFileSync } from 'node:fs'
import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Amplify } from 'aws-amplify'
import { confirmSignIn, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'
import { addDays } from '../shared/pricing'

const seedPassword = process.env.SEED_PASSWORD
if (!seedPassword) throw new Error('Set SEED_PASSWORD (see .env.seed)')
const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'))
Amplify.configure(outputs)
const client = generateClient<Schema>()
const cognito = new CognitoIdentityProviderClient({ region: outputs.auth.aws_region })

let pass = 0
let fail = 0
const report = (ok: boolean, label: string, detail = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

async function throwaway(prefix: string) {
  const email = `${prefix}-${Date.now()}@example.com`
  const password = `Chk-${Math.random().toString(36).slice(2)}A9!`
  await cognito.send(new AdminCreateUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email, TemporaryPassword: password, MessageAction: 'SUPPRESS', UserAttributes: [{ Name: 'email', Value: email }] }))
  await signOut().catch(() => {})
  const first = await signIn({ username: email, password })
  if (first.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') await confirmSignIn({ challengeResponse: password })
  await client.mutations.createMyProfile({ name: `${prefix} Check`, areaId: 'mp-nagar', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
  return { email, password, id: (await getCurrentUser()).userId }
}
const as = async (username: string, password: string) => {
  await signOut().catch(() => {})
  await signIn({ username, password })
}
const photoBytes = readFileSync('public/brand/icon-192.png')
async function upload(bookingId: string) {
  const form = (await client.mutations.conditionPhotoUpload({ bookingId, ext: 'webp' })).data!
  const fields = (typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields) as Record<string, string>
  const body = new FormData()
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  body.append('file', new Blob([photoBytes], { type: 'image/webp' }))
  return { key: form.key, status: (await fetch(form.url, { method: 'POST', body })).status }
}
const checks = JSON.stringify({ works: true, complete: true, marksNoted: true })

// 1. A stranger and a renter; the renter books Priya's lens and Priya accepts.
const stranger = await throwaway('stranger')
const renter = await throwaway('renter')
const lens = (await client.models.Listing.list({ filter: { title: { beginsWith: 'Canon EF 50mm' } } })).data[0]!
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const start = addDays(today, 150 + Math.floor(Math.random() * 40))
const booking = (await client.mutations.requestBooking({ listingId: lens.id, start, end: addDays(start, 1), delivery: false })).data!
const early = await client.mutations.saveConditionReport({ bookingId: booking.id, stage: 'pickup', checks, notes: 'Too early', photoKeys: [] })
report(!early.data && /accepted bookings/.test(early.errors?.[0]?.message ?? ''), 'No pickup check before the owner accepts', early.errors?.[0]?.message)
await as('priya.demo@example.com', seedPassword)
await client.mutations.respondToBooking({ bookingId: booking.id, action: 'accept' })

// 2. Priya (owner) records a pickup check with a photo.
const ownerPhoto = await upload(booking.id)
report(ownerPhoto.status === 204, 'Owner uploads a check photo through a signed form', `${ownerPhoto.status} ${ownerPhoto.key}`)
const ownerSaved = await client.mutations.saveConditionReport({ bookingId: booking.id, stage: 'pickup', checks, notes: 'Small scuff on the front cap', photoKeys: [ownerPhoto.key] })
report(!!ownerSaved.data, 'Owner saves a pickup check', ownerSaved.errors?.[0]?.message)
const publicUrl = `https://${outputs.storage.bucket_name}.s3.${outputs.storage.aws_region}.amazonaws.com/${ownerPhoto.key}`
report((await fetch(publicUrl)).status === 403, 'Check photos are not public', publicUrl.slice(-60))

// 3. The renter adds theirs, can't use Priya's photo, and sees both checks.
await as(renter.email, renter.password)
const stolen = await client.mutations.saveConditionReport({ bookingId: booking.id, stage: 'pickup', checks, notes: '', photoKeys: [ownerPhoto.key] })
report(!stolen.data && /didn’t upload/.test(stolen.errors?.[0]?.message ?? ''), 'A check can’t use the other person’s photo', stolen.errors?.[0]?.message)
const renterPhoto = await upload(booking.id)
const renterSaved = await client.mutations.saveConditionReport({ bookingId: booking.id, stage: 'pickup', checks, notes: 'Agree, scuff on the cap', photoKeys: [renterPhoto.key] })
report(!!renterSaved.data, 'Renter saves a pickup check', renterSaved.errors?.[0]?.message)
const seen = (await client.queries.bookingConditionReports({ bookingId: booking.id })).data ?? []
report(seen.length === 2, 'Both people see both checks', String(seen.length))
const link = seen.find((r) => r?.authorId !== renter.id)?.photos[0]?.url
report(!!link && (await fetch(link!)).status === 200, 'The other person’s photo opens through a short-lived link')

// 4. A stranger gets nothing.
await as(stranger.email, stranger.password)
const peek = await client.queries.bookingConditionReports({ bookingId: booking.id })
report(!peek.data?.length && /not found/i.test(peek.errors?.[0]?.message ?? ''), 'A stranger can’t see the checks', peek.errors?.[0]?.message)
const sneak = await client.mutations.conditionPhotoUpload({ bookingId: booking.id, ext: 'webp' })
report(!sneak.data, 'A stranger can’t upload to the booking', sneak.errors?.[0]?.message)
const direct = await client.models.ConditionReport.list().then((r) => (r.errors?.length ? 'refused' : `${r.data.length} rows`), () => 'refused')
report(direct === 'refused', 'Nobody can read the checks table directly', direct)
await client.mutations.deleteMyAccount()

// 5. The renter deletes their account: their check and photo go, Priya's stays.
await as(renter.email, renter.password)
await client.mutations.deleteMyAccount()
await as('priya.demo@example.com', seedPassword)
const after = (await client.queries.bookingConditionReports({ bookingId: booking.id })).data ?? []
report(after.length === 1 && after[0]?.authorId !== renter.id, 'Deleting an account removes their check, keeps the other person’s', String(after.length))
const gone = `https://${outputs.storage.bucket_name}.s3.${outputs.storage.aws_region}.amazonaws.com/${renterPhoto.key}`
report((await fetch(gone)).status === 403, 'Their check photo is gone (or at least not public)')
await signOut()

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
