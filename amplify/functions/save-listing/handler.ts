import { env } from '$amplify/env/save-listing'
import type { Schema } from '../../data/resource'
import { amplifyStore, dataClient, listingStore } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'
import { saveListing } from '../logic/listings'
import { photoBucket } from '../logic/photoBucket'

export const handler: Schema['saveListing']['functionHandler'] = (event) =>
  guarded('saveListing', async () => {
    const client = await dataClient(env)
    const store = listingStore(client, amplifyStore(client), photoBucket())
    const { id, listing } = event.arguments
    const saved = await saveListing(store, { id, listing }, callerId(event.identity), todayIST())
    return { ...saved, condition: saved.condition.replace(/-/g, '_') } as never
  })
