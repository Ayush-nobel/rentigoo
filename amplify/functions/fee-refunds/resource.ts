import { defineFunction } from '@aws-amplify/backend'

/** Every hour: refunds booking fees the owner's cancellation (or leaving) made refundable. */
export const feeRefundsFn = defineFunction({
  name: 'fee-refunds',
  entry: './handler.ts',
  schedule: 'every 1h',
  timeoutSeconds: 120,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  logging: { retention: '1 month' },
})
