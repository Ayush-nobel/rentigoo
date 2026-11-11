import { env } from '$amplify/env/messages'
import { amplifyStore, dataClient, messageStore } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'
import { markRead, openConversation, sendMessage } from '../logic/messages'

interface Event {
  fieldName: 'openConversation' | 'sendMessage' | 'markConversationRead'
  arguments: { listingId?: string; otherUserId?: string; conversationId?: string; text?: string }
  identity: unknown
}

/** Serves openConversation, sendMessage and markConversationRead. */
export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const client = await dataClient(env)
    const store = messageStore(client, amplifyStore(client))
    const actor = callerId(event.identity)
    const now = new Date().toISOString()
    const a = event.arguments
    if (event.fieldName === 'openConversation') return openConversation(store, a.listingId!, a.otherUserId!, actor, now)
    if (event.fieldName === 'sendMessage') return sendMessage(store, a.conversationId!, a.text, actor, now)
    return markRead(store, a.conversationId!, actor, now)
  })
