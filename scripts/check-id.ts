/**
 * End-to-end check of ID checks against the sandbox (test mode: no DigiLocker).
 *   set -a; . ./.env.seed; set +a; npx tsx --tsconfig amplify/tsconfig.json scripts/check-id.ts
 */
import { readFileSync } from 'node:fs'
import { AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { Amplify } from 'aws-amplify'
import { confirmSignIn, getCurrentUser, signIn, signOut } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../amplify/data/resource'
import { LEGAL } from '../shared/legal'

const outputs = JSON.parse(readFileSync('amplify_outputs.json', 'utf8'))
Amplify.configure(outputs)
const client = generateClient<Schema>()
const cognito = new CognitoIdentityProviderClient({ region: outputs.auth.aws_region })
let pass = 0
let fail = 0
const report = (ok: boolean, label: string, detail = '') => {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}
async function throwaway(prefix: string, name: string) {
  const email = `${prefix}-${Date.now()}@example.com`
  const password = `Chk-${Math.random().toString(36).slice(2)}A9!`
  await cognito.send(new AdminCreateUserCommand({ UserPoolId: outputs.auth.user_pool_id, Username: email, TemporaryPassword: password, MessageAction: 'SUPPRESS', UserAttributes: [{ Name: 'email', Value: email }] }))
  await signOut().catch(() => {})
  const first = await signIn({ username: email, password })
  if (first.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') await confirmSignIn({ challengeResponse: password })
  await client.mutations.createMyProfile({ name, areaId: 'mp-nagar', termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version })
  return { email, password, id: (await getCurrentUser()).userId }
}
const back = 'http://localhost:5173/account/id-check'

const other = await throwaway('id-other', 'Other Person')
const otherStart = (await client.mutations.startIdCheck({ returnUrl: back })).data!
const otherRequest = new URL(otherStart.url).searchParams.get('id')!

const me = await throwaway('id-check', 'Kavya Rao')
const status0 = (await client.queries.idCheckStatus()).data
report(status0?.available === true && status0.verified === false, 'ID checks are available in the sandbox, not yet done', JSON.stringify(status0))
const evil = await client.mutations.startIdCheck({ returnUrl: 'https://evil.example/account/id-check' })
report(!evil.data, 'Refuses to send people back anywhere but our own site', evil.errors?.[0]?.message)
const steal = await client.mutations.finishIdCheck({ requestId: otherRequest })
report(!steal.data?.verified, 'Can’t finish someone else’s ID check', steal.errors?.[0]?.message)
const start = (await client.mutations.startIdCheck({ returnUrl: back })).data!
const url = new URL(start.url)
report(url.origin === 'http://localhost:5173' && url.searchParams.get('success') === 'True', 'Test mode sends straight back with success', url.search)
const done = await client.mutations.finishIdCheck({ requestId: url.searchParams.get('id')! })
report(done.data?.verified === true, 'Finishing gives the badge', done.errors?.[0]?.message)
const profile = (await client.models.UserProfile.get({ id: me.id })).data
report(profile?.verifiedGovtId === true, 'The profile shows ID checked')
const direct = await client.models.IdCheck.list().then((r) => (r.errors?.length ? 'refused' : `${r.data.length} rows`), () => 'refused')
report(direct === 'refused', 'Nobody can read ID check records directly', direct)
const removed = await client.mutations.forgetIdCheck()
report(removed.data?.verified === false, 'Removing the check takes the badge away')
await client.mutations.deleteMyAccount()
await signOut().catch(() => {})
await signIn({ username: other.email, password: other.password }).catch(() => {})
await client.mutations.deleteMyAccount()
await signOut()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
