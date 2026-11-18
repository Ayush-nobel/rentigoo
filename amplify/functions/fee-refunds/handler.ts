import { env } from '$amplify/env/fee-refunds'
import { dataClient, feeStore } from '../logic/amplifyStore'
import { processRefunds } from '../logic/bookingFee'
import { feeProvider } from '../logic/feeProvider'

/** Runs every hour (see resource.ts). */
export const handler = async () => {
  const refunded = await processRefunds({ store: feeStore(await dataClient(env)), provider: feeProvider() })
  if (refunded) console.log(`Refunded ${refunded} booking fees`)
  return { refunded }
}
