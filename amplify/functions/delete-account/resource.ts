import { defineFunction } from '@aws-amplify/backend'

export const deleteAccountFn = defineFunction({
  name: 'delete-account',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
