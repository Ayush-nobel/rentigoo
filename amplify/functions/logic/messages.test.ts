import { describe, expect, it } from 'vitest'
import type { StoredListing } from './bookings'
import { markRead, openConversation, sendMessage, type MessageStore, type StoredConversation, type StoredMessage } from './messages'

const NOW = '2026-11-11T10:00:00.000Z'
const listing = { id: 'tent', ownerId: 'owner', status: 'active' } as StoredListing

function store(listings: StoredListing[] = [listing]) {
  const convos = new Map<string, StoredConversation>()
  const messages: StoredMessage[] = []
  let n = 0
  const s: MessageStore = {
    async getListing(id) { return listings.find((l) => l.id === id) ?? null },
    async getConversation(id) { return structuredClone(convos.get(id) ?? null) },
    async listConversationsForListing(id) { return [...convos.values()].filter((c) => c.listingId === id) },
    async createConversation(c) { const x = { ...c, id: `c${++n}` }; convos.set(x.id, x); return structuredClone(x) },
    async updateConversation(id, patch) { Object.assign(convos.get(id)!, patch); return structuredClone(convos.get(id)!) },
    async createMessage(m) { const x = { ...m, id: `m${++n}` }; messages.push(x); return structuredClone(x) },
    async listMessages(id) { return messages.filter((m) => m.conversationId === id) },
    async setMessageRead(id, at) { messages.find((m) => m.id === id)!.readAt = at },
  }
  return { s, convos, messages }
}

describe('openConversation', () => {
  it('starts one conversation per pair and listing, and finds it again', async () => {
    const { s, convos } = store()
    const a = await openConversation(s, 'tent', 'owner', 'renter', NOW)
    const b = await openConversation(s, 'tent', 'renter', 'owner', NOW)
    expect(b.id).toBe(a.id)
    expect(convos.size).toBe(1)
  })
  it('needs the listing owner in it, and no self-chats', async () => {
    const { s } = store()
    await expect(openConversation(s, 'tent', 'stranger', 'renter', NOW)).rejects.toThrow(/owner of a listing/)
    await expect(openConversation(s, 'tent', 'owner', 'owner', NOW)).rejects.toThrow(/yourself/)
    await expect(openConversation(s, 'nope', 'owner', 'renter', NOW)).rejects.toThrow(/doesn’t exist/)
  })
  it('won’t start a new one about a paused listing', async () => {
    const { s } = store([{ ...listing, status: 'paused' }])
    await expect(openConversation(s, 'tent', 'owner', 'renter', NOW)).rejects.toThrow(/isn’t available/)
  })
})

describe('sendMessage and markRead', () => {
  it('always records the caller as the sender, and only participants can write', async () => {
    const { s, messages } = store()
    const c = await openConversation(s, 'tent', 'owner', 'renter', NOW)
    const m = await sendMessage(s, c.id, '  Is it free on Saturday?  ', 'renter', NOW)
    expect(m).toMatchObject({ senderId: 'renter', text: 'Is it free on Saturday?', participantIds: ['renter', 'owner'] })
    await expect(sendMessage(s, c.id, 'hi', 'stranger', NOW)).rejects.toThrow(/not found/)
    await expect(sendMessage(s, c.id, '   ', 'renter', NOW)).rejects.toThrow(/Write a message/)
    await expect(sendMessage(s, c.id, 'x'.repeat(2001), 'renter', NOW)).rejects.toThrow(/too long/)
    expect(messages).toHaveLength(1)
  })
  it('tracks who has seen the latest message', async () => {
    const { s, convos, messages } = store()
    const c = await openConversation(s, 'tent', 'owner', 'renter', NOW)
    await sendMessage(s, c.id, 'Is it free on Saturday?', 'renter', NOW)
    expect(convos.get(c.id)!.readBy).toEqual(['renter'])
    expect(await markRead(s, c.id, 'renter', NOW)).toBe(0) // your own messages don't count
    expect(await markRead(s, c.id, 'owner', NOW)).toBe(1)
    expect(messages[0]!.readAt).toBe(NOW)
    expect(convos.get(c.id)!.readBy).toEqual(['renter', 'owner'])
    await expect(markRead(s, c.id, 'stranger', NOW)).rejects.toThrow(/not found/)
  })
})
