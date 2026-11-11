import { env } from '$amplify/env/save-listing'
import { amplifyStore, dataClient, listingStore } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'
import { deleteMyListing, saveListing } from '../logic/listings'
import { photoBucket } from '../logic/photoBucket'

/** What Amplify sends a function that backs a custom query or mutation. */
interface Event {
  fieldName: string
  arguments: { id?: string | null; listing?: unknown }
  identity: unknown
}

/** Serves both saveListing and deleteMyListing. */
export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const client = await dataClient(env)
    const store = listingStore(client, amplifyStore(client), photoBucket())
    const actor = callerId(event.identity)
    if (event.fieldName === 'deleteMyListing') return deleteMyListing(store, event.arguments.id!, actor)
    const saved = await saveListing(store, { id: event.arguments.id, listing: event.arguments.listing }, actor, todayIST())
    return { ...saved, condition: saved.condition.replace(/-/g, '_') }
  })
