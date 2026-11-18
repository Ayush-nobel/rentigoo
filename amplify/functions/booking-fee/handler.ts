import { env } from '$amplify/env/booking-fee'
import { dataClient, feeStore } from '../logic/amplifyStore'
import { confirmFeePayment, startFeePayment } from '../logic/bookingFee'
import { allowedReturn, feeProvider } from '../logic/feeProvider'
import { callerId, guarded } from '../logic/handlerKit'

interface Event {
  fieldName: 'startBookingFee' | 'confirmBookingFee'
  arguments: { bookingId: string; returnUrl?: string; params?: unknown }
  identity: unknown
}

export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const store = feeStore(await dataClient(env))
    const actor = callerId(event.identity)
    const provider = feeProvider()
    if (event.fieldName === 'startBookingFee') return startFeePayment({ store, provider, allowedReturn: allowedReturn('/booking-fee') }, actor, event.arguments.bookingId, event.arguments.returnUrl ?? '')
    const raw = typeof event.arguments.params === 'string' ? JSON.parse(event.arguments.params) : event.arguments.params
    const params = Object.fromEntries(Object.entries((raw ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
    return confirmFeePayment({ store, provider, now: new Date() }, actor, event.arguments.bookingId, params)
  })
