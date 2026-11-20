import { describe, expect, it } from 'vitest'
import { discardPhotos, purgeUnusedReceipts, RECEIPT_UPLOAD, startPhotoUpload, startReceiptUpload, UPLOAD, type PhotoUploadStore } from './photos'

function fakeStore(opts: { count?: number; onListings?: string[]; billsOnListings?: string[] } = {}) {
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
    async receiptsOnListings() {
      return opts.billsOnListings ?? []
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

describe('bills', () => {
  const bill = (n: number, owner = 'user-1') => `listing-receipts/${owner}/3f2b6d1e-1a2b-4c3d-8e9f-0a1b2c3d4e5${n}.pdf`

  it('signs one photo or PDF in the caller’s own private folder', async () => {
    const f = fakeStore()
    const r = await startReceiptUpload(f.store, 'user-1', 'pdf')
    expect(r.key).toMatch(/^listing-receipts\/user-1\/[0-9a-f-]{36}\.pdf$/)
    expect(f.signed).toEqual([{ key: r.key, type: 'application/pdf', max: RECEIPT_UPLOAD.pdfMaxBytes }])
    await expect(startReceiptUpload(f.store, 'user-1', 'exe')).rejects.toThrow(/photo .* or a PDF/)
  })

  it('discards only the caller’s unused bills', async () => {
    const f = fakeStore({ billsOnListings: [bill(2)] })
    await discardPhotos(f.store, 'user-1', [bill(1), bill(2), bill(3, 'someone')])
    expect(f.deleted).toEqual([bill(1)])
  })

  it('deletes bills never saved with a listing once they’re a day old', async () => {
    const deleted: string[] = []
    const now = new Date('2026-11-20T10:00:00Z')
    const n = await purgeUnusedReceipts(
      {
        async listReceiptFiles() {
          return [
            { key: bill(1), uploadedAt: new Date('2026-11-18T10:00:00Z') }, // old, unused
            { key: bill(2), uploadedAt: new Date('2026-11-18T10:00:00Z') }, // old, on a listing
            { key: bill(3), uploadedAt: new Date('2026-11-20T09:00:00Z') }, // new: the form may still be open
          ]
        },
        async receiptKeysInUse() {
          return [bill(2)]
        },
        async deletePhotos(keys) {
          deleted.push(...keys)
        },
      },
      now,
    )
    expect(n).toBe(1)
    expect(deleted).toEqual([bill(1)])
  })
})
