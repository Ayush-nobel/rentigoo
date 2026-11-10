import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { ownerStatsFn } from './functions/owner-stats/resource'
import { requestBookingFn } from './functions/request-booking/resource'
import { respondToBookingFn } from './functions/respond-to-booking/resource'
import { submitReviewFn } from './functions/submit-review/resource'
import { storage } from './storage/resource'

defineBackend({
  auth,
  data,
  storage,
  requestBookingFn,
  respondToBookingFn,
  submitReviewFn,
  ownerStatsFn,
})
