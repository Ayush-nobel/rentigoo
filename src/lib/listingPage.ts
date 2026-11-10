import { api } from '@/lib'

/** Everything the listing page shows. Plain arrays, so it can be embedded as JSON. */
export type ListingPageData = NonNullable<Awaited<ReturnType<typeof loadListingPage>>>

export async function loadListingPage(id: string) {
  const listing = await api.getListing(id)
  if (!listing) return null
  const [owner, reviews, related] = await Promise.all([
    api.getUser(listing.ownerId),
    api.listReviewsForListing(id),
    api.searchListings({ category: listing.categoryId }),
  ])
  const authors = await api.getUsers([...new Set(reviews.map((r) => r.authorId))])
  // Plain arrays (not Maps) so the prerender can embed this in the page as JSON.
  return { listing, owner, reviews, authors, related: related.items.filter((l) => l.id !== id).slice(0, 4) }
}
