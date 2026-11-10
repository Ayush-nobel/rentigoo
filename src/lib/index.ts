import { Amplify } from 'aws-amplify'
import type { RentiGooApi } from './api'
import { amplifyApi } from './api.amplify'
import { mockApi } from './api.mock'
import { cognitoAuth, mockAuth, type AuthService } from './auth'

/**
 * The data source for the whole app.
 * - `VITE_DATA_MODE=amplify` talks to the AWS backend (needs amplify_outputs.json,
 *   written by `npx ampx sandbox` or the Amplify build).
 * - Anything else uses the seed data in the browser.
 */
const outputs = Object.values(import.meta.glob('../../amplify_outputs.json', { eager: true, import: 'default' }))[0] as
  | Record<string, unknown>
  | undefined

const wantsAmplify = import.meta.env.VITE_DATA_MODE === 'amplify'
const hasBackend = Boolean(outputs && 'data' in outputs)

if (wantsAmplify && hasBackend) Amplify.configure(outputs!)
if (wantsAmplify && !hasBackend) {
  console.warn('VITE_DATA_MODE=amplify but amplify_outputs.json has no backend yet. Using the built-in demo data.')
}

export const DATA_MODE: 'amplify' | 'mock' = wantsAmplify && hasBackend ? 'amplify' : 'mock'
export const api: RentiGooApi = DATA_MODE === 'amplify' ? amplifyApi : mockApi
export const auth: AuthService = DATA_MODE === 'amplify' ? cognitoAuth : mockAuth

export { ApiError } from './api'
export { AuthError, safeNext } from './auth'
export type { BookingRequest, ListingInput } from './api'
