import { describe, expect, it } from 'vitest'
import { discardPhotos, startPhotoUpload, UPLOAD, type PhotoUploadStore } from './photos'

function fakeStore(opts: { count?: number; onListings?: string[] } = {}) {
  const deleted: string[] = []
  const signed: { key: string; type: string; max: number }[] = []
  const store: PhotoUploadStore = {
    async countPhotos() {
      return opts.count ?? 0
    },
    async presignUpload(key, type, max) {
      signed.push({ key, type, max })
      return { url: 'https://bucket.example/', fields: { key } }
    },
    async deletePhotos(keys) {
      deleted.push(...keys)
    },
    async photosOnListings() {
      return opts.onListings ?? []
    },
  }
  return { store, deleted, signed }
}

describe('startPhotoUpload', () => {
  it('signs one small image in the caller’s own folder', async () => {
    const f = fakeStore()
    const r = await startPhotoUpload(f.store, 'user-1', 'webp')
    expect(r.key).toMatch(/^listing-photos\/user-1\/[0-9a-f-]{36}\.webp$/)
    expect(f.signed).toEqual([{ key: r.key, type: 'image/webp', max: UPLOAD.maxBytes }])
  })

  it('refuses other file types, and too many files', async () => {
    await expect(startPhotoUpload(fakeStore().store, 'user-1', 'html')).rejects.toThrow(/WebP or JPEG/)
    await expect(startPhotoUpload(fakeStore({ count: UPLOAD.maxFilesPerPerson }).store, 'user-1', 'jpg')).rejects.toThrow(/most photos/)
  })
})

describe('discardPhotos', () => {
  const mine = (n: number) => `listing-photos/user-1/7c9e6679-7425-40de-944b-e07fc1f90ae${n}.webp`
  it('deletes only the caller’s own unused uploads', async () => {
    const f = fakeStore({ onListings: [mine(2)] })
    await discardPhotos(f.store, 'user-1', [mine(1), mine(2), 'listing-photos/user-2/7c9e6679-7425-40de-944b-e07fc1f90ae3.webp', 'not-a-key'])
    expect(f.deleted).toEqual([mine(1)])
  })

  it('refuses a huge list', async () => {
    await expect(discardPhotos(fakeStore().store, 'user-1', Array.from({ length: UPLOAD.maxDiscard + 1 }, (_, i) => mine(i % 10)))).rejects.toThrow()
  })
})
