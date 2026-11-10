import type { RentiGooApi } from './api'
import { mockApi } from './api.mock'

/**
 * The data source for the whole app. `VITE_DATA_MODE=amplify` switches to
 * the AppSync adapter once the backend exists (build step 5).
 */
export const api: RentiGooApi = mockApi

export { ApiError } from './api'
export type { BookingRequest, ListingInput } from './api'
