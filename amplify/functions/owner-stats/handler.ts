import { env } from '$amplify/env/owner-stats'
import type { Schema } from '../../data/resource'
import { ownerStats } from '../logic/bookings'
import { amplifyStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'

export const handler: Schema['ownerStats']['functionHandler'] = (event) =>
  guarded('ownerStats', async () => {
    const store = amplifyStore(await dataClient(env))
    return ownerStats(store, callerId(event.identity), todayIST().slice(0, 7))
  })
