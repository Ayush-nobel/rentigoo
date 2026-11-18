import { defineStorage } from '@aws-amplify/backend'

/**
 * Listing photos and avatars. Everyone can see them. Avatars: only the person
 * who uploaded one (their own identity folder) can change or delete it.
 */
export const storage = defineStorage({
  name: 'rentigooPhotos',
  access: (allow) => ({
    // Read-only from the browser. Uploads go through a form the save-listing
    // function signs for the person's own folder; deletes go through it too.
    'listing-photos/*': [allow.guest.to(['read']), allow.authenticated.to(['read'])],
    'avatars/{entity_id}/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
})
