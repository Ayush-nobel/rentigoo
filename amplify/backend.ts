import { defineBackend, secret } from '@aws-amplify/backend'
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
import { conditionReportsFn } from './functions/condition-reports/resource'
import { idCheckFn } from './functions/id-check/resource'
import { bookingFeeFn } from './functions/booking-fee/resource'
import { feeRefundsFn } from './functions/fee-refunds/resource'
import { purgeConditionReportsFn } from './functions/purge-condition-reports/resource'
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
  conditionReportsFn,
  purgeConditionReportsFn,
  idCheckFn,
  bookingFeeFn,
  feeRefundsFn,
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

// Original bills: private in listing-receipts/<user sub>/ (no public read, no
// browser access at all; RentiGoo opens them in the AWS console). saveListing
// signs uploads, checks a file is there and deletes replaced ones;
// deleteMyAccount deletes the person's whole bill folder.
const receiptObjects = bucket.arnForObjects('listing-receipts/*')
const receiptList = new PolicyStatement({ actions: ['s3:ListBucket'], resources: [bucket.bucketArn], conditions: { StringLike: { 's3:prefix': ['listing-receipts/*'] } } })
backend.saveListingFn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'], resources: [receiptObjects] }))
backend.saveListingFn.resources.lambda.addToRolePolicy(receiptList)
// The daily cleanup deletes bills uploaded but never saved with a listing.
for (const fn of [backend.deleteAccountFn, backend.purgeConditionReportsFn]) {
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:DeleteObject'], resources: [receiptObjects] }))
  fn.resources.lambda.addToRolePolicy(receiptList)
}

// Pickup and return check photos: private (no public read; only signed links that
// expire), in condition-photos/<user sub>/. The condition-reports function signs
// uploads and view links; the daily purge and account deletion remove them.
const conditionObjects = bucket.arnForObjects('condition-photos/*')
const conditionList = new PolicyStatement({ actions: ['s3:ListBucket'], resources: [bucket.bucketArn], conditions: { StringLike: { 's3:prefix': ['condition-photos/*'] } } })
backend.conditionReportsFn.addEnvironment('PHOTO_BUCKET', bucket.bucketName)
backend.conditionReportsFn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'], resources: [conditionObjects] }))
backend.conditionReportsFn.resources.lambda.addToRolePolicy(conditionList)
backend.purgeConditionReportsFn.addEnvironment('PHOTO_BUCKET', bucket.bucketName) // deleteAccountFn has it already
for (const fn of [backend.purgeConditionReportsFn, backend.deleteAccountFn]) {
  fn.resources.lambda.addToRolePolicy(new PolicyStatement({ actions: ['s3:DeleteObject'], resources: [conditionObjects] }))
  fn.resources.lambda.addToRolePolicy(conditionList)
}

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

// ID checks through DigiLocker (Setu). Production switches on when SETU_CLIENT_ID and
// SETU_PRODUCT_INSTANCE_ID are set as environment variables on the main branch in
// Amplify Hosting, and SETU_CLIENT_SECRET as an Amplify secret. Until then: off, and
// the site says nothing about ID checks (vite.config.ts uses the same rule).
// Sandboxes use test mode: no DigiLocker, the check always succeeds with the profile name.
const setuReady = Boolean(process.env.SETU_CLIENT_ID && process.env.SETU_PRODUCT_INSTANCE_ID)
const idMode = !process.env.AWS_BRANCH ? 'test' : setuReady ? 'setu' : 'off'
backend.idCheckFn.addEnvironment('ID_CHECK_MODE', idMode)
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://www.rentigoo.in').replace(/\/$/, '')
backend.idCheckFn.addEnvironment('ID_RETURN_ORIGINS', idMode === 'test' ? `${siteUrl},http://localhost:*,http://127.0.0.1:*` : siteUrl)
if (idMode === 'setu') {
  backend.idCheckFn.addEnvironment('SETU_CLIENT_ID', process.env.SETU_CLIENT_ID!)
  backend.idCheckFn.addEnvironment('SETU_PRODUCT_INSTANCE_ID', process.env.SETU_PRODUCT_INSTANCE_ID!)
  backend.idCheckFn.addEnvironment('SETU_CLIENT_SECRET', secret('SETU_CLIENT_SECRET'))
  if (process.env.SETU_BASE_URL) backend.idCheckFn.addEnvironment('SETU_BASE_URL', process.env.SETU_BASE_URL)
}

// The booking fee (shared/policy.ts), paid online through Razorpay payment links.
// Production switches on when RAZORPAY_KEY_ID is set as an environment variable on
// the main branch and RAZORPAY_KEY_SECRET as an Amplify secret. Until then: off,
// bookings carry no fee and the site says booking is free (vite.config.ts, same rule).
// Sandboxes use test mode: no Razorpay, the "payment page" comes straight back as paid.
const feeMode = !process.env.AWS_BRANCH ? 'test' : process.env.RAZORPAY_KEY_ID ? 'razorpay' : 'off'
for (const fn of [backend.bookingFeeFn, backend.feeRefundsFn, backend.respondToBookingFn]) fn.addEnvironment('BOOKING_FEE_MODE', feeMode)
backend.bookingFeeFn.addEnvironment('RETURN_ORIGINS', feeMode === 'test' ? `${siteUrl},http://localhost:*,http://127.0.0.1:*` : siteUrl)
if (feeMode === 'razorpay') {
  for (const fn of [backend.bookingFeeFn, backend.feeRefundsFn]) {
    fn.addEnvironment('RAZORPAY_KEY_ID', process.env.RAZORPAY_KEY_ID!)
    fn.addEnvironment('RAZORPAY_KEY_SECRET', secret('RAZORPAY_KEY_SECRET'))
  }
}

