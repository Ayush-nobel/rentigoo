import { addDays, quoteListing } from '@shared/pricing'
import type { Booking, Conversation, Listing, Message } from '@shared/types'
import { todayIST } from '@/lib/format'
import { LISTINGS } from './listings'
import { DEMO_USER_ID } from './users'

const today = todayIST()
const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()
const listing = (id: string): Listing => {
  const l = LISTINGS.find((x) => x.id === id)
  if (!l) throw new Error(`Seed listing missing: ${id}`)
  return l
}

function booking(
  id: string,
  listingId: string,
  renterId: string,
  startOffset: number,
  days: number,
  status: Booking['status'],
  createdMinsAgo: number,
  delivery = false,
  message?: string,
): Booking {
  const l = listing(listingId)
  const start = addDays(today, startOffset)
  const end = addDays(start, days)
  return {
    id,
    listingId,
    renterId,
    ownerId: l.ownerId,
    start,
    end,
    delivery,
    quote: quoteListing(l, start, end, delivery),
    status,
    paymentStatus: status === 'completed' ? 'paid' : 'pay-at-pickup',
    ...(message ? { message } : {}),
    createdAt: ago(createdMinsAgo),
  }
}

export const BOOKINGS: Booking[] = [
  // Ananya renting from others
  booking('b-1', 'l-sony-a7iii', DEMO_USER_ID, 18, 3, 'requested', 90, false, 'Hi Priya! It’s for my brother’s engagement. I’ve used a Nikon before, so a quick walkthrough would be great.'),
  booking('b-2', 'l-jbl-partybox', DEMO_USER_ID, 6, 1, 'accepted', 60 * 26, true),
  booking('b-3', 'l-air-purifier', DEMO_USER_ID, -3, 14, 'active', 60 * 24 * 4),
  booking('b-4', 'l-bosch-drill', DEMO_USER_ID, -31, 1, 'completed', 60 * 24 * 33),
  // Others renting from Ananya
  booking('b-5', 'l-sleeping-bags', 'u-vikram', 20, 4, 'requested', 35, false, 'Heading to Kedarkantha with a friend. Are both bags available?'),
  booking('b-6', 'l-sleeping-bags', 'u-simran', 9, 3, 'accepted', 60 * 30),
  booking('b-7', 'l-sleeping-bags', 'u-rohan', -48, 3, 'completed', 60 * 24 * 52),
]

export const CONVERSATIONS: Conversation[] = [
  { id: 'c-1', listingId: 'l-sony-a7iii', participantIds: [DEMO_USER_ID, 'u-priya'], lastMessageAt: ago(80), lastMessagePreview: '' },
  { id: 'c-2', listingId: 'l-sleeping-bags', participantIds: [DEMO_USER_ID, 'u-vikram'], lastMessageAt: ago(30), lastMessagePreview: '' },
  { id: 'c-3', listingId: 'l-jbl-partybox', participantIds: [DEMO_USER_ID, 'u-arjun'], lastMessageAt: ago(60 * 20), lastMessagePreview: '' },
]

type M = [conversationId: string, senderId: string, text: string, minsAgo: number, read: boolean]
const rows: M[] = [
  ['c-1', DEMO_USER_ID, 'Hi Priya! I’ve sent a request for the A7 III for the 3 days around my brother’s engagement.', 92, true],
  ['c-1', 'u-priya', 'Hi Ananya, congratulations to your brother! Those dates look fine. Are you okay picking up from Saket?', 85, true],
  ['c-1', 'u-priya', 'I can do a 15-minute walkthrough of the autofocus modes when you come.', 80, false],
  ['c-2', 'u-vikram', 'Hi! Requested both sleeping bags for Kedarkantha. Are they okay for −5° nights?', 36, false],
  ['c-2', 'u-vikram', 'Also, is pickup from Rohini possible on a weekday evening?', 30, false],
  ['c-3', 'u-arjun', 'Accepted! I’ll bring the PartyBox around 5 pm on the day, if that works.', 60 * 22, true],
  ['c-3', DEMO_USER_ID, 'Perfect, thank you. Third floor, there’s a lift.', 60 * 20, true],
]

export const MESSAGES: Message[] = rows.map(([conversationId, senderId, text, minsAgo, read], i) => ({
  id: `m-${i + 1}`,
  conversationId,
  senderId,
  text,
  sentAt: ago(minsAgo),
  ...(read ? { readAt: ago(Math.max(0, minsAgo - 1)) } : {}),
}))

for (const c of CONVERSATIONS) {
  const last = MESSAGES.filter((m) => m.conversationId === c.id).at(-1)
  if (last) {
    c.lastMessagePreview = last.text
    c.lastMessageAt = last.sentAt
  }
}
