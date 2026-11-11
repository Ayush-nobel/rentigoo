import { env } from '$amplify/env/request-booking'
import type { Schema } from '../../data/resource'
import { requestBooking } from '../logic/bookings'
import { amplifyStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'

export const handler: Schema['requestBooking']['functionHandler'] = (event) =>
  guarded('requestBooking', async () => {
    const store = amplifyStore(await dataClient(env))
    const { listingId, start, end, delivery, message, months } = event.arguments
    const booking = await requestBooking(store, { listingId, start, end, delivery, message, months }, callerId(event.identity), todayIST())
    return { ...booking, paymentStatus: 'pay_at_pickup' } as never
  })
