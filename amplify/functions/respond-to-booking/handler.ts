import { env } from '$amplify/env/respond-to-booking'
import type { Schema } from '../../data/resource'
import { POLICY } from '../../../shared/policy'
import { respondToBooking, type BookingAction } from '../logic/bookings'
import { amplifyStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded, todayIST } from '../logic/handlerKit'

export const handler: Schema['respondToBooking']['functionHandler'] = (event) =>
  guarded('respondToBooking', async () => {
    const store = amplifyStore(await dataClient(env))
    const { bookingId, action } = event.arguments
    const feeOn = process.env.BOOKING_FEE_MODE === 'test' || process.env.BOOKING_FEE_MODE === 'razorpay'
    const b = await respondToBooking(store, bookingId, action as BookingAction, callerId(event.identity), todayIST(), { bookingFee: feeOn ? POLICY.bookingFee : undefined })
    // The fee may have just changed: send its current state, not the row read before the change.
    return { ...b, feeStatus: b.fee?.status ?? null, feeAmount: b.fee?.amount ?? null, paymentStatus: b.paymentStatus.replace(/-/g, '_') } as never
  })
