import { LEGAL } from '@shared/legal'
import type { RentiGooApi } from './api'

/**
 * Everything RentiGoo holds about the signed-in person, gathered through the
 * same API the app uses (so it can only ever include what they're allowed to see).
 */
export async function collectMyData(api: RentiGooApi, userId: string, email: string | null) {
  const [profile, listings, bookingsAsRenter, bookingsAsOwner, reviewsAboutMe, reviewsIWrote, conversations] = await Promise.all([
    api.getUser(userId),
    api.listListingsByOwner(userId),
    api.listMyBookings(),
    api.listRequestsForMe(),
    api.listReviewsForUser(userId),
    api.listReviewsByAuthor(userId),
    api.listConversations(),
  ])
  const threads = await Promise.all(
    conversations.map(async (c) => ({ conversation: c, messages: await api.listMessages(c.id) })),
  )
  return {
    about: 'Your RentiGoo data. Other people’s details in conversations and bookings appear only as needed to make sense of your own.',
    exportedAt: new Date().toISOString(),
    policiesInForce: { terms: LEGAL.terms.version, privacy: LEGAL.privacy.version },
    account: { userId, email },
    profile,
    listings,
    bookings: { asRenter: bookingsAsRenter, asOwner: bookingsAsOwner },
    reviews: { aboutMe: reviewsAboutMe, writtenByMe: reviewsIWrote },
    conversations: threads,
  }
}

/** Offer a JSON file to save. */
export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
