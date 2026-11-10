import { env } from '$amplify/env/submit-review'
import type { Schema } from '../../data/resource'
import { submitReview } from '../logic/bookings'
import { amplifyStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'

export const handler: Schema['submitReview']['functionHandler'] = (event) =>
  guarded('submitReview', async () => {
    const store = amplifyStore(await dataClient(env))
    const { bookingId, rating, text } = event.arguments
    return (await submitReview(store, { bookingId, rating, text }, callerId(event.identity))) as never
  })
