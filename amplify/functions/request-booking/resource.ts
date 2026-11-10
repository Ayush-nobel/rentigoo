import { defineFunction } from '@aws-amplify/backend'

export const requestBookingFn = defineFunction({
  name: 'request-booking',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 512,
  runtime: 22,
  // Lives in the data stack so the data API can call it without a circular dependency.
  resourceGroupName: 'data',
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
