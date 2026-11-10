import { defineBackend } from '@aws-amplify/backend'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { createProfileFn } from './functions/create-profile/resource'
import { deleteAccountFn } from './functions/delete-account/resource'
import { ownerStatsFn } from './functions/owner-stats/resource'
import { requestBookingFn } from './functions/request-booking/resource'
import { respondToBookingFn } from './functions/respond-to-booking/resource'
import { submitReviewFn } from './functions/submit-review/resource'
import { storage } from './storage/resource'

const backend = defineBackend({
  auth,
  data,
  storage,
  createProfileFn,
  deleteAccountFn,
  requestBookingFn,
  respondToBookingFn,
  submitReviewFn,
  ownerStatsFn,
})

// createMyProfile reads the person's email_verified attribute straight from
// Cognito (AppSync only sees the access token, which doesn't carry it).
const userPool = backend.auth.resources.userPool
const profileLambda = backend.createProfileFn.resources.lambda
profileLambda.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:AdminGetUser'], resources: [userPool.userPoolArn] }))
backend.createProfileFn.addEnvironment('USER_POOL_ID', userPool.userPoolId)

// deleteMyAccount removes the person's login from Cognito as its last step.
const deleteLambda = backend.deleteAccountFn.resources.lambda
deleteLambda.addToRolePolicy(new PolicyStatement({ actions: ['cognito-idp:AdminDeleteUser'], resources: [userPool.userPoolArn] }))
backend.deleteAccountFn.addEnvironment('USER_POOL_ID', userPool.userPoolId)
