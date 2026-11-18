import { describe, expect, it } from 'vitest'
import type { ConditionReport } from '../../../shared/conditionReports'
import { listConditionReports, purgeConditionReports, saveConditionReport, startConditionPhotoUpload, type ConditionStore } from './conditionReports'

const photo = (who: string, n: number) => `condition-photos/${who}/7c9e6679-7425-40de-944b-e07fc1f90ae${n}.webp`
const NOW = new Date('2026-11-18T10:00:00Z')

function fake(status = 'active', updatedAt = '2026-11-17T10:00:00Z') {
  const reports = new Map<string, ConditionReport>()
  const deleted: string[] = []
  const booking = { id: 'b1', status, participants: ['owner', 'renter'], updatedAt } as never
  const store: ConditionStore = {
    async getBooking(id) {
      return id === 'b1' ? booking : null
    },
    async listReports(id) {
      return [...reports.values()].filter((r) => r.bookingId === id)
    },
    async listAllReports() {
      return [...reports.values()]
    },
    async putReport(r) {
      reports.set(r.id, r)
    },
    async deleteReport(id) {
      reports.delete(id)
    },
    async countPhotos() {
      return 0
    },
    async presignUpload(key) {
      return { url: 'https://bucket.example/', fields: { key } }
    },
    async viewUrl(key) {
      return `https://signed.example/${key}`
    },
    async deletePhotos(keys) {
      deleted.push(...keys)
    },
  }
  return { store, reports, deleted }
}

const input = (over: object = {}) => ({ bookingId: 'b1', stage: 'pickup', checks: { works: true, complete: true, marksNoted: false }, notes: 'Small scratch on the lens hood', photoKeys: [photo('renter', 1)], ...over })

describe('condition checks', () => {
  it('lets either person record their own check, and both see both', async () => {
    const f = fake()
    await saveConditionReport(f.store, input(), 'renter', NOW)
    await saveConditionReport(f.store, input({ photoKeys: [photo('owner', 2)] }), 'owner', NOW)
    const seen = await listConditionReports(f.store, 'b1', 'owner')
    expect(seen.map((r) => r.authorId).sort()).toEqual(['owner', 'renter'])
    expect(seen.find((r) => r.authorId === 'renter')!.photos[0]!.url).toMatch(/^https:\/\/signed\.example\//)
  })

  it('keeps everyone else out', async () => {
    const f = fake()
    await expect(saveConditionReport(f.store, input(), 'stranger', NOW)).rejects.toThrow(/not found/)
    await expect(listConditionReports(f.store, 'b1', 'stranger')).rejects.toThrow(/not found/)
    await expect(startConditionPhotoUpload(f.store, 'stranger', 'b1', 'webp')).rejects.toThrow(/not found/)
  })

  it('accepts only the author’s own photos, and only at pickup or return', async () => {
    await expect(saveConditionReport(fake().store, input({ photoKeys: [photo('owner', 1)] }), 'renter', NOW)).rejects.toThrow(/didn’t upload/)
    await expect(saveConditionReport(fake('requested').store, input(), 'renter', NOW)).rejects.toThrow(/accepted bookings/)
    await expect(saveConditionReport(fake('accepted').store, input({ stage: 'return' }), 'renter', NOW)).rejects.toThrow(/comes back/)
    await expect(saveConditionReport(fake().store, input({ photoKeys: [], notes: ' ' }), 'renter', NOW)).rejects.toThrow(/at least one photo/)
  })

  it('replacing a check deletes the photos taken off it', async () => {
    const f = fake()
    await saveConditionReport(f.store, input({ photoKeys: [photo('renter', 1), photo('renter', 2)] }), 'renter', NOW)
    await saveConditionReport(f.store, input({ photoKeys: [photo('renter', 2)] }), 'renter', NOW)
    expect(f.reports.size).toBe(1)
    expect(f.deleted).toEqual([photo('renter', 1)])
  })

  it('upload links are for the caller’s own folder', async () => {
    const r = await startConditionPhotoUpload(fake().store, 'renter', 'b1', 'webp')
    expect(r.key).toMatch(/^condition-photos\/renter\/[0-9a-f-]{36}\.webp$/)
  })

  it('deletes checks and photos 30 days after the rental ends, not before', async () => {
    const ended = fake('completed', '2026-10-01T10:00:00Z')
    await ended.store.putReport({ id: 'r1', bookingId: 'b1', stage: 'pickup', authorId: 'renter', checks: { works: true, complete: true, marksNoted: true }, notes: '', photoKeys: [photo('renter', 3)], createdAt: '' })
    expect(await purgeConditionReports(ended.store, NOW)).toBe(1)
    expect(ended.deleted).toEqual([photo('renter', 3)])

    const recent = fake('completed', '2026-11-10T10:00:00Z')
    await recent.store.putReport({ id: 'r1', bookingId: 'b1', stage: 'pickup', authorId: 'renter', checks: { works: true, complete: true, marksNoted: true }, notes: 'ok', photoKeys: [], createdAt: '' })
    expect(await purgeConditionReports(recent.store, NOW)).toBe(0)
  })
})
