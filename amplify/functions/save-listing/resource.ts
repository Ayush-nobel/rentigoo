import { defineFunction } from '@aws-amplify/backend'

export const saveListingFn = defineFunction({
  name: 'save-listing',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
