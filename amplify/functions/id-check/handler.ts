import { env } from '$amplify/env/id-check'
import { dataClient, idStore } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'
import { finishIdCheck, forgetIdCheck, idCheckStatus, offProvider, setuProvider, startIdCheck, testProvider, type IdProvider } from '../logic/idCheck'

interface Event {
  fieldName: 'idCheckStatus' | 'startIdCheck' | 'finishIdCheck' | 'forgetIdCheck'
  arguments: { returnUrl?: string; requestId?: string }
  identity: unknown
}

const origins = (process.env.ID_RETURN_ORIGINS ?? '').split(',').filter(Boolean)
/** Only back to our own site's ID-check page (or a local copy in a sandbox). */
const allowedReturn = (url: string) => {
  try {
    const u = new URL(url)
    return u.pathname === '/account/id-check' && origins.some((o) => (o.endsWith(':*') ? `${u.protocol}//${u.hostname}:*` === o : u.origin === o))
  } catch {
    return false
  }
}

export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const store = idStore(await dataClient(env))
    const userId = callerId(event.identity)
    const mode = process.env.ID_CHECK_MODE
    const provider: IdProvider =
      mode === 'setu'
        ? setuProvider({
            baseUrl: process.env.SETU_BASE_URL ?? 'https://dg.setu.co',
            clientId: process.env.SETU_CLIENT_ID ?? '',
            clientSecret: process.env.SETU_CLIENT_SECRET ?? '',
            productInstanceId: process.env.SETU_PRODUCT_INSTANCE_ID ?? '',
          })
        : mode === 'test'
          ? testProvider(async () => (await store.getProfileName(userId)) ?? '', userId)
          : offProvider
    const ctx = { store, provider, secret: env.ID_PEPPER, allowedReturn, now: new Date() }
    switch (event.fieldName) {
      case 'idCheckStatus':
        return idCheckStatus(ctx, userId)
      case 'startIdCheck':
        return startIdCheck(ctx, userId, event.arguments.returnUrl ?? '')
      case 'finishIdCheck':
        return finishIdCheck(ctx, userId, event.arguments.requestId ?? '')
      case 'forgetIdCheck':
        return forgetIdCheck(ctx, userId)
    }
  })
