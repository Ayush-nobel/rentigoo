import { defineFunction, secret } from '@aws-amplify/backend'

/** ID checks through DigiLocker (Setu). Switched on in backend.ts only when the Setu keys are set. */
export const idCheckFn = defineFunction({
  name: 'id-check',
  entry: './handler.ts',
  timeoutSeconds: 20,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  environment: {
    // Key for ID fingerprints (HMAC), shared with phone checks. Never commit it.
    ID_PEPPER: secret('PHONE_PEPPER'),
  },
  logging: { retention: '1 month' },
})
