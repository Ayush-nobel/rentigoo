import { defineFunction, secret } from '@aws-amplify/backend'

export const phoneCheckFn = defineFunction({
  name: 'phone-check',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 512,
  runtime: 22,
  resourceGroupName: 'data',
  environment: {
    // Key for the number fingerprints (HMAC). Set per backend with `ampx sandbox secret set PHONE_PEPPER`
    // or in Amplify Hosting > Secrets. Never commit it; changing it un-verifies every number.
    PHONE_PEPPER: secret('PHONE_PEPPER'),
  },
  // Logs can hold personal data in error details: keep them a month, then AWS deletes them.
  logging: { retention: '1 month' },
})
