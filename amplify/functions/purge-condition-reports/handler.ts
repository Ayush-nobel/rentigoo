import { env } from '$amplify/env/purge-condition-reports'
import { conditionStore, dataClient } from '../logic/amplifyStore'
import { purgeConditionReports } from '../logic/conditionReports'
import { conditionBucket } from '../logic/photoBucket'

/** Runs once a day (see resource.ts). */
export const handler = async () => {
  const purged = await purgeConditionReports(conditionStore(await dataClient(env), conditionBucket()), new Date())
  console.log(`Deleted ${purged} pickup/return checks whose rentals ended 30+ days ago`)
  return { purged }
}
