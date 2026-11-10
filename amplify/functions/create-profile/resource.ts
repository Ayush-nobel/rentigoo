import { defineFunction } from '@aws-amplify/backend'

export const createProfileFn = defineFunction({
  name: 'create-profile',
  entry: './handler.ts',
  timeoutSeconds: 10,
  memoryMB: 256,
  runtime: 22,
  resourceGroupName: 'data',
})
