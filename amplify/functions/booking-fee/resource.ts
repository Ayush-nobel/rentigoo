import { defineFunction } from '@aws-amplify/backend'

/** The booking fee: starts a Razorpay payment link and confirms the payment. Switched on in backend.ts with the Razorpay keys. */
export const bookingFeeFn = defineFunction({
  name: 'booking-fee',
  entry: './handler.ts',
  timeoutSeconds: 20,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  logging: { retention: '1 month' },
})
