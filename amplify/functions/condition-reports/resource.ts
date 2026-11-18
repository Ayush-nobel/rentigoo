import { defineFunction } from '@aws-amplify/backend'

/** Pickup and return checks: signed photo uploads, saving checks, and viewing them. */
export const conditionReportsFn = defineFunction({
  name: 'condition-reports',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
