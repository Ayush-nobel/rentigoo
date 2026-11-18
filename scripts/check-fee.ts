/**
 * End-to-end check of the booking fee against the sandbox (test mode: no Razorpay).
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/check-fee.ts
 */
import { readFileSync } from 'node:fs'
import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Amplify } from 'aws-amplify'
import { confirmSignIn, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'
import { addDays } from '../shared/pricing'

const seedPassword = process.env.SEED_PASSWORD
if (!seedPassword) throw new Error('Set SEED_PASSWORD (see .env.seed)')
const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'))
Amplify.configure(outputs)
const client = generateClient<Schema>()
let pass = 0
let fail = 0
const report = (ok: boolean, label: string, detail = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}
const as = async (username: string, password: string) => {
  await signOut().catch(() => {})
  await signIn({ username, password })
}

const email = `fee-check-${Date.now()}@example.com`
const password = `Chk-${Math.random().toString(36).slice(2)}A9!`
await new CognitoIdentityProviderClient({ region: outputs.auth.aws_region }).send(
  new AdminCreateUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email, TemporaryPassword: password, MessageAction: 'SUPPRESS', UserAttributes: [{ Name: 'email', Value: email }] }),
)
await signOut().catch(() => {})
const first = await signIn({ username: email, password })
if (first.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') await confirmSignIn({ challengeResponse: password })
await client.mutations.createMyProfile({ name: 'Fee Check', areaId: 'mp-nagar', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })

const lens = (await client.models.Listing.list({ filter: { title: { beginsWith: 'Canon EF 50mm' } } })).data[0]!
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const start = addDays(today, 200 + Math.floor(Math.random() * 60))
const booking = (await client.mutations.requestBooking({ listingId: lens.id, start, end: addDays(start, 1), delivery: false })).data!
const early = await client.mutations.startBookingFee({ bookingId: booking.id, returnUrl: 'http://localhost:5173/booking-fee' })
report(!early.data, 'Nothing to pay before the owner accepts', early.errors?.[0]?.message)

await as('priya.demo@example.com', seedPassword)
const accepted = (await client.mutations.respondToBooking({ bookingId: booking.id, action: 'accept' })).data
report(accepted?.feeStatus === 'due' && accepted.feeAmount === 49, 'Accepting makes the ₹49 fee due', `${accepted?.feeStatus} ${accepted?.feeAmount}`)
const handover = await client.mutations.respondToBooking({ bookingId: booking.id, action: 'handover' })
report(!handover.data && /booking fee/.test(handover.errors?.[0]?.message ?? ''), 'Owner can’t hand over before the fee is paid', handover.errors?.[0]?.message)
const ownerPays = await client.mutations.startBookingFee({ bookingId: booking.id, returnUrl: 'http://localhost:5173/booking-fee' })
report(!ownerPays.data, 'Only the renter can pay', ownerPays.errors?.[0]?.message)

await as(email, password)
const evil = await client.mutations.startBookingFee({ bookingId: booking.id, returnUrl: 'https://evil.example/booking-fee' })
report(!evil.data, 'The payment page only returns to our site', evil.errors?.[0]?.message)
const link = (await client.mutations.startBookingFee({ bookingId: booking.id, returnUrl: `http://localhost:5173/booking-fee?booking=${booking.id}` })).data!
const params = Object.fromEntries(new URL(link.url).searchParams)
const forged = await client.mutations.confirmBookingFee({ bookingId: booking.id, params: JSON.stringify({ ...params, razorpay_signature: 'forged' }) })
report(!forged.data?.paid, 'A forged payment result is refused', forged.errors?.[0]?.message)
const paid = await client.mutations.confirmBookingFee({ bookingId: booking.id, params: JSON.stringify(params) })
report(paid.data?.paid === true, 'A real (test) payment marks the fee paid', paid.errors?.[0]?.message)

await as('priya.demo@example.com', seedPassword)
const cancelled = (await client.mutations.respondToBooking({ bookingId: booking.id, action: 'cancel' })).data
report(cancelled?.feeStatus === 'refund_due', 'Owner cancelling after payment queues a refund', cancelled?.feeStatus ?? '')

await as(email, password)
await client.mutations.deleteMyAccount()
await signOut()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
