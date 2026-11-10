import { defineStorage } from '@aws-amplify/backend'

/**
 * Listing photos and avatars. Everyone can see them; only the person who
 * uploaded a file (their own identity folder) can change or delete it.
 */
export const storage = defineStorage({
  name: 'rentigooPhotos',
  access: (allow) => ({
    'listing-photos/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'avatars/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
})
