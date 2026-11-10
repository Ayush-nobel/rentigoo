import { describe, expect, it } from 'vitest'
import { LEGAL } from '../../../shared/legal'
import { createMyProfile, type ProfileRow, type ProfileStore } from './profile'

function store(seed: ProfileRow[] = []) {
  const rows = new Map<string, ProfileRow & Record<string, unknown>>(seed.map((r) => [r.id, { ...r }]))
  const s: ProfileStore = {
    async getProfile(id) {
      return rows.get(id) ?? null
    },
    async createProfile(row) {
      rows.set(row.id, row)
      return row
    },
    async updateServerFields(id, fields) {
      const r = rows.get(id)!
      Object.assign(r, fields)
      return r
    },
  }
  return { s, rows }
}
const agree = { termsVersion: LEGAL.terms.version, privacyVersion: LEGAL.privacy.version }
const NOW = new Date('2026-11-10T09:00:00.000Z')

describe('createMyProfile', () => {
  it('creates a tidy profile, a public name, the email badge and a consent record', async () => {
    const { s, rows } = store()
    await createMyProfile(s, { name: '  Meera   Joshi ', areaId: 'arera-colony', ...agree }, 'sub-1', true, NOW)
    expect(rows.get('sub-1')).toMatchObject({
      name: 'Meera Joshi',
      displayName: 'Meera J.',
      verifiedEmail: true,
      termsVersion: LEGAL.terms.version,
      privacyVersion: LEGAL.privacy.version,
      consentAt: '2026-11-10T09:00:00.000Z',
    })
  })

  it('refuses without agreement to the current documents', async () => {
    const { s } = store()
    await expect(createMyProfile(s, { name: 'Meera', areaId: 'arera-colony', termsVersion: '2020-01-01', privacyVersion: LEGAL.privacy.version }, 'sub-1', true)).rejects.toThrow(/latest Terms/)
    await expect(createMyProfile(s, { name: 'Meera', areaId: 'arera-colony', termsVersion: '', privacyVersion: '' }, 'sub-1', true)).rejects.toThrow(/latest Terms/)
  })

  it('is safe to call twice', async () => {
    const { s, rows } = store()
    await createMyProfile(s, { name: 'Meera', areaId: 'arera-colony', ...agree }, 'sub-1', true)
    const again = await createMyProfile(s, { name: 'Someone Else', areaId: 'mp-nagar', ...agree }, 'sub-1', true)
    expect(again.name).toBe('Meera')
    expect(rows.size).toBe(1)
  })

  it('brings older profiles up to date: badge and public name', async () => {
    const { s } = store([{ id: 'sub-2', userId: 'sub-2', name: 'Priya Malhotra', areaId: 'mp-nagar', verifiedEmail: null }])
    const p = await createMyProfile(s, { name: 'x', areaId: 'x', ...agree }, 'sub-2', true)
    expect(p).toMatchObject({ verifiedEmail: true, displayName: 'Priya M.', name: 'Priya Malhotra' })
  })

  it('validates name and area on the server', async () => {
    const { s } = store()
    await expect(createMyProfile(s, { name: 'M', areaId: 'arera-colony', ...agree }, 'sub-3', true)).rejects.toThrow(/name/)
    await expect(createMyProfile(s, { name: 'Meera', areaId: 'connaught-place', ...agree }, 'sub-3', true)).rejects.toThrow(/area/)
  })
})
