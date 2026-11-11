/**
 * Conversations and messages. The sender is always the signed-in caller
 * (never taken from the request), only the two people in a conversation can
 * write to it, and messages can't be edited afterwards.
 */
import { RuleError, type StoredListing } from './bookings'

export interface StoredConversation {
  id: string
  listingId: string
  participantIds: string[]
  lastMessageAt: string
  lastSenderId?: string | null
  /** Who has seen the latest message. */
  readBy: string[]
}

export interface StoredMessage {
  id: string
  conversationId: string
  senderId: string
  participantIds: string[]
  text: string
  sentAt: string
  readAt?: string | null
}

export interface MessageStore {
  getListing(id: string): Promise<StoredListing | null>
  getConversation(id: string): Promise<StoredConversation | null>
  listConversationsForListing(listingId: string): Promise<StoredConversation[]>
  createConversation(c: Omit<StoredConversation, 'id'>): Promise<StoredConversation>
  updateConversation(id: string, patch: Partial<Omit<StoredConversation, 'id'>>): Promise<StoredConversation>
  createMessage(m: Omit<StoredMessage, 'id'>): Promise<StoredMessage>
  listMessages(conversationId: string): Promise<StoredMessage[]>
  setMessageRead(id: string, at: string): Promise<void>
}

export const MESSAGE_MAX = 2000

const samePair = (c: StoredConversation, a: string, b: string) => c.participantIds.includes(a) && c.participantIds.includes(b)

/** Finds or starts the conversation between the caller and another person about a listing. One of them must own it. */
export async function openConversation(store: MessageStore, listingId: string, otherId: string, actorId: string, now: string): Promise<StoredConversation> {
  if (!otherId || otherId === actorId) throw new RuleError('You can’t message yourself.')
  const listing = await store.getListing(listingId)
  if (!listing) throw new RuleError('That listing doesn’t exist any more.')
  if (listing.ownerId !== actorId && listing.ownerId !== otherId) throw new RuleError('You can only message the owner of a listing.')
  const existing = (await store.listConversationsForListing(listingId)).find((c) => samePair(c, actorId, otherId))
  if (existing) return existing
  // A new conversation about someone else's listing needs that listing to be live.
  if (listing.ownerId !== actorId && listing.status !== 'active') throw new RuleError('This listing isn’t available right now.')
  return store.createConversation({ listingId, participantIds: [actorId, otherId], lastMessageAt: now, lastSenderId: null, readBy: [actorId, otherId] })
}

export async function sendMessage(store: MessageStore, conversationId: string, text: unknown, actorId: string, now: string): Promise<StoredMessage> {
  const c = await store.getConversation(conversationId)
  if (!c || !c.participantIds.includes(actorId)) throw new RuleError('Conversation not found.')
  const body = typeof text === 'string' ? text.trim() : ''
  if (!body) throw new RuleError('Write a message first.')
  if (body.length > MESSAGE_MAX) throw new RuleError('That message is too long. Keep it under 2,000 characters.')
  const message = await store.createMessage({ conversationId, senderId: actorId, participantIds: c.participantIds, text: body, sentAt: now })
  await store.updateConversation(conversationId, { lastMessageAt: now, lastSenderId: actorId, readBy: [actorId] })
  return message
}

/** Marks the other person's messages as seen by the caller. */
export async function markRead(store: MessageStore, conversationId: string, actorId: string, now: string): Promise<number> {
  const c = await store.getConversation(conversationId)
  if (!c || !c.participantIds.includes(actorId)) throw new RuleError('Conversation not found.')
  const unread = (await store.listMessages(conversationId)).filter((m) => m.senderId !== actorId && !m.readAt)
  for (const m of unread) await store.setMessageRead(m.id, now)
  if (!c.readBy.includes(actorId)) await store.updateConversation(conversationId, { readBy: [...c.readBy, actorId] })
  return unread.length
}
