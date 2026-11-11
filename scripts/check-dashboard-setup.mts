/**
 * Sets up the Dashboard browser check in the sandbox: a fresh request from
 * Ananya on Priya's Sony A7 III, and a throwaway draft listing for Priya.
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/check-dashboard-setup.mts
 */
import { readFileSync } from 'node:fs'
import { Amplify } from 'aws-amplify'
import { signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { addDays } from '../shared/pricing'

Amplify.configure(JSON.parse(readFileSync('amplify_outputs.json', 'utf8')))
const password = process.env.SEED_PASSWORD!
const c = generateClient<Schema>()
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const start = addDays(today, 240 + Math.floor(Math.random() * 60))

await signOut().catch(() => {})
// A failed earlier run may have left the listing paused.
await signIn({ username: 'priya.demo@example.com', password })
const sony = (await c.models.Listing.list({ filter: { title: { beginsWith: 'Sony A7 III' } } })).data[0]!
if (sony.status !== 'active') await c.mutations.saveListing({ id: sony.id, listing: JSON.stringify({ status: 'active' }) })
await signOut()

await signIn({ username: 'ananya.demo@example.com', password })
const b = await c.mutations.requestBooking({ listingId: sony.id, start, end: addDays(start, 2), delivery: false, message: 'Dashboard check: for a weekend shoot at Van Vihar.' })
if (!b.data) throw new Error(b.errors?.[0]?.message)
await signOut()

await signIn({ username: 'priya.demo@example.com', password })
const draft = await c.mutations.saveListing({
  listing: JSON.stringify({ title: 'Old tripod (delete check)', description: '', categoryId: '', areaId: '', photos: [], condition: 'good', pricing: { daily: 0 }, deposit: 0, minDays: 1, maxDays: 7, pickupOptions: ['pickup'], blockedDates: [], rules: [], status: 'draft' }),
})
if (!draft.data) throw new Error(draft.errors?.[0]?.message)
await signOut()
console.log(JSON.stringify({ bookingId: b.data.id, start, draftId: draft.data.id }))
