import { defineBackend } from '@aws-amplify/backend'
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { createProfileFn } from './functions/create-profile/resource'
import { deleteAccountFn } from './functions/delete-account/resource'
import { ownerStatsFn } from './functions/owner-stats/resource'
import { requestBookingFn } from './functions/request-booking/resource'
import { respondToBookingFn } from './functions/respond-to-booking/resource'
import { saveListingFn } from './functions/save-listing/resource'
import { messagesFn } from './functions/messages/resource'
import { phoneCheckFn } from './functions/phone-check/resource'
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
  saveListingFn,
  messagesFn,
  phoneCheckFn,
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

// Listing photos are public by nature (they're on public listing pages), so
// they're served by plain, stable URLs that work in prerendered HTML and in
// link previews. Only reading is public: uploads still need a login and go
// to the uploader's own folder. Avatars and everything else stay private.
const bucket = backend.storage.resources.bucket
backend.storage.resources.cfnResources.cfnBucket.publicAccessBlockConfiguration = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: false,
  restrictPublicBuckets: false,
}
bucket.addToResourcePolicy(
  new PolicyStatement({ principals: [new AnyPrincipal()], actions: ['s3:GetObject'], resources: [bucket.arnForObjects('listing-photos/*')] }),
)

// saveListing deletes photos taken off a listing; deleteMyAccount deletes the
// person's whole photo folder. Neither can touch anything outside listing-photos/.
for (const fn of [backend.saveListingFn, backend.deleteAccountFn]) {
  fn.addEnvironment('PHOTO_BUCKET', bucket.bucketName)
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:DeleteObject'], resources: [bucket.arnForObjects('listing-photos/*')] }))
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({ actions: ['s3:ListBucket'], resources: [bucket.bucketArn], conditions: { StringLike: { 's3:prefix': ['listing-photos/*'] } } }),
  )
}

// Listing photo uploads: saveListing signs a one-file upload form for the
// person's own folder (the browser has no write access to the bucket).
backend.saveListingFn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:PutObject'], resources: [bucket.arnForObjects('listing-photos/*')] }))

// Test backends (sandboxes and branches other than main) accept the built-in
// placeholder pictures, so demo data can be seeded through saveListing like
// real listings. Production only accepts real uploads.
if (process.env.AWS_BRANCH !== 'main') backend.saveListingFn.addEnvironment('ALLOW_PLACEHOLDER_PHOTOS', 'true')

// When a public listing appears, changes or goes away, ask Amplify Hosting to
// rebuild so its page is prerendered (see functions/logic/rebuild.ts). Only on
// the production branch: AWS_APP_ID and AWS_BRANCH exist only in Amplify's
// own build, never in a sandbox.
const appId = process.env.AWS_APP_ID
if (appId && process.env.AWS_BRANCH === 'main') {
  const { region, account } = backend.saveListingFn.stack
  for (const fn of [backend.saveListingFn, backend.deleteAccountFn]) {
    fn.addEnvironment('REBUILD_APP_ID', appId)
    fn.addEnvironment('REBUILD_BRANCH', 'main')
    fn.resources.lambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['amplify:StartJob', 'amplify:ListJobs'],
        resources: [`arn:aws:amplify:${region}:${account}:apps/${appId}/branches/main/jobs/*`, `arn:aws:amplify:${region}:${account}:apps/${appId}/branches/main`],
      }),
    )
  }
}

// Phone checks by SMS. India requires a DLT registration: once you have the
// IDs, set DLT_ENTITY_ID, DLT_TEMPLATE_ID and SMS_SENDER_ID as environment
// variables on the main branch in Amplify Hosting, and the next deploy
// switches SMS on. Until then production says "not switched on yet".
// Sandboxes use test mode: no SMS is sent and the code is always 246810.
const dlt = { DLT_ENTITY_ID: process.env.DLT_ENTITY_ID, DLT_TEMPLATE_ID: process.env.DLT_TEMPLATE_ID, SMS_SENDER_ID: process.env.SMS_SENDER_ID }
const smsMode = !process.env.AWS_BRANCH ? 'test' : Object.values(dlt).every(Boolean) ? 'sns' : 'off'
backend.phoneCheckFn.addEnvironment('SMS_MODE', smsMode)
if (smsMode === 'sns') {
  for (const [k, v] of Object.entries(dlt)) backend.phoneCheckFn.addEnvironment(k, v!)
  // Publishing straight to a phone number has no resource ARN to scope to.
  backend.phoneCheckFn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['sns:Publish'], notResources: ['arn:aws:sns:*:*:*'] }))
}
// Daily send counters delete themselves (DynamoDB TTL).
backend.data.resources.cfnResources.amplifyDynamoDbTables['PhoneSendCount']!.timeToLiveAttribute = { attributeName: 'ttl', enabled: true }
