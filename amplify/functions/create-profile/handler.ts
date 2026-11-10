import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { env } from '$amplify/env/create-profile'
import type { Schema } from '../../data/resource'
import { dataClient } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'
import { createMyProfile, type ProfileStore } from '../logic/profile'

const cognito = new CognitoIdentityProviderClient({})

/** Whether Cognito has confirmed this person's email (the source of truth for the badge). */
async function emailVerified(sub: string): Promise<boolean> {
  const poolId = process.env.USER_POOL_ID
  if (!poolId) return false
  // With email sign-in, the Cognito username is the person's sub.
  const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: poolId, Username: sub }))
  return user.UserAttributes?.some((a) => a.Name === 'email_verified' && a.Value === 'true') ?? false
}

export const handler: Schema['createMyProfile']['functionHandler'] = (event) =>
  guarded('createMyProfile', async () => {
    const m = (await dataClient(env)).models
    const store: ProfileStore = {
      async getProfile(id) {
        return (await m.UserProfile.get({ id })).data as never
      },
      async createProfile(row) {
        const res = await m.UserProfile.create(row as never)
        if (res.errors?.length || !res.data) throw new Error(res.errors?.map((e) => e.message).join('; ') ?? 'Profile not saved')
        return res.data as never
      },
      async setVerifiedEmail(id, verified) {
        return (await m.UserProfile.update({ id, verifiedEmail: verified } as never)).data as never
      },
    }
    const sub = callerId(event.identity)
    return (await createMyProfile(store, event.arguments, sub, await emailVerified(sub))) as never
  })
