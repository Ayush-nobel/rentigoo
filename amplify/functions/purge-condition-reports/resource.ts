import { defineFunction } from '@aws-amplify/backend'

/** Once a day: deletes pickup and return checks (and their photos) 30 days after the rental ended. */
export const purgeConditionReportsFn = defineFunction({
  name: 'purge-condition-reports',
  entry: './handler.ts',
  schedule: 'every day',
  timeoutSeconds: 300,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  logging: { retention: '1 month' },
})
