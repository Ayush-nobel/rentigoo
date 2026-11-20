import { env } from '$amplify/env/purge-condition-reports'
import { conditionStore, dataClient, receiptKeysInUse } from '../logic/amplifyStore'
import { purgeConditionReports } from '../logic/conditionReports'
import { conditionBucket, receiptBucket } from '../logic/photoBucket'
import { purgeUnusedReceipts } from '../logic/photos'

/** Runs once a day (see resource.ts): old pickup/return checks, and bills never saved with a listing. */
export const handler = async () => {
  const client = await dataClient(env)
  const purged = await purgeConditionReports(conditionStore(client, conditionBucket()), new Date())
  console.log(`Deleted ${purged} pickup/return checks whose rentals ended 30+ days ago`)
  const bills = receiptBucket()
  const unusedBills = await purgeUnusedReceipts({ ...bills, receiptKeysInUse: () => receiptKeysInUse(client) }, new Date())
  console.log(`Deleted ${unusedBills} bills uploaded but never saved with a listing`)
  return { purged, unusedBills }
}
