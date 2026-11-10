import { defineFunction } from '@aws-amplify/backend'

export const createProfileFn = defineFunction({
  name: 'create-profile',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
  runtime: 22,
  resourceGroupName: 'data',
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
