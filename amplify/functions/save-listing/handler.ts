import { env } from '$amplify/env/save-listing'
import { amplifyStore, dataClient, listingStore, photoUploadStore } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'
import { deleteMyListing, saveListing } from '../logic/listings'
import { photoBucket } from '../logic/photoBucket'
import { discardPhotos, startPhotoUpload } from '../logic/photos'

/** What Amplify sends a function that backs a custom query or mutation. */
interface Event {
  fieldName: string
  arguments: { id?: string | null; listing?: unknown; ext?: unknown; keys?: unknown }
  identity: unknown
}

/** Serves saveListing, deleteMyListing, and listing photo uploads (listingPhotoUpload, discardListingPhotos). */
export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const client = await dataClient(env)
    const actorId = callerId(event.identity)
    if (event.fieldName === 'listingPhotoUpload') return startPhotoUpload(photoBucket(), actorId, event.arguments.ext)
    if (event.fieldName === 'discardListingPhotos') return discardPhotos(photoUploadStore(client, photoBucket()), actorId, event.arguments.keys)
    const store = listingStore(client, amplifyStore(client), photoBucket())
    if (event.fieldName === 'deleteMyListing') return deleteMyListing(store, event.arguments.id!, actorId)
    // Demo pictures are allowed only on test backends (set in backend.ts; never on the production branch).
    const saved = await saveListing(store, { id: event.arguments.id, listing: event.arguments.listing }, actorId, todayIST(), { allowPlaceholders: process.env.ALLOW_PLACEHOLDER_PHOTOS === 'true' })
    return { ...saved, condition: saved.condition.replace(/-/g, '_') }
  })
