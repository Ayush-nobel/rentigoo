import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { env } from '$amplify/env/delete-account'
import type { Schema } from '../../data/resource'
import { deleteMyAccount } from '../logic/account'
import { accountStore, dataClient } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'
import { photoBucket } from '../logic/photoBucket'

const cognito = new CognitoIdentityProviderClient({})

export const handler: Schema['deleteMyAccount']['functionHandler'] = (event) =>
  guarded('deleteMyAccount', async () => {
    const sub = callerId(event.identity)
    const store = accountStore(await dataClient(env), async (id) => {
      const poolId = process.env.USER_POOL_ID
      if (!poolId) throw new Error('USER_POOL_ID missing')
      try {
        // With email sign-in, the Cognito username is the person's sub.
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: id }))
      } catch (e) {
        if ((e as { name?: string }).name !== 'UserNotFoundException') throw e
      }
    }, photoBucket())
    return deleteMyAccount(store, sub)
  })
