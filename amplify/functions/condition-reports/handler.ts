import { env } from '$amplify/env/condition-reports'
import { conditionStore, dataClient } from '../logic/amplifyStore'
import { listConditionReports, saveConditionReport, startConditionPhotoUpload } from '../logic/conditionReports'
import { callerId, guarded } from '../logic/handlerKit'
import { conditionBucket } from '../logic/photoBucket'

interface Event {
  fieldName: string
  arguments: { bookingId: string; ext?: unknown; stage?: unknown; checks?: unknown; notes?: unknown; photoKeys?: unknown }
  identity: unknown
}

/** Serves conditionPhotoUpload, saveConditionReport and bookingConditionReports. */
export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const store = conditionStore(await dataClient(env), conditionBucket())
    const actor = callerId(event.identity)
    const a = event.arguments
    if (event.fieldName === 'conditionPhotoUpload') return startConditionPhotoUpload(store, actor, a.bookingId, a.ext)
    if (event.fieldName === 'bookingConditionReports') return listConditionReports(store, a.bookingId, actor)
    const checks = typeof a.checks === 'string' ? JSON.parse(a.checks) : a.checks
    return saveConditionReport(store, { bookingId: a.bookingId, stage: a.stage, checks, notes: a.notes, photoKeys: a.photoKeys }, actor, new Date())
  })
