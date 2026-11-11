import { env } from '$amplify/env/respond-to-booking'
import type { Schema } from '../../data/resource'
import { respondToBooking, type BookingAction } from '../logic/bookings'
import { amplifyStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'

export const handler: Schema['respondToBooking']['functionHandler'] = (event) =>
  guarded('respondToBooking', async () => {
    const store = amplifyStore(await dataClient(env))
    const { bookingId, action } = event.arguments
    const b = await respondToBooking(store, bookingId, action as BookingAction, callerId(event.identity), todayIST())
    return { ...b, paymentStatus: b.paymentStatus.replace(/-/g, '_') } as never
  })
