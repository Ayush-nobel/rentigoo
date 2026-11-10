import { describe, expect, it } from 'vitest'
import { createMyProfile, type ProfileRow, type ProfileStore } from './profile'

function store(seed: ProfileRow[] = []) {
  const rows = new Map(seed.map((r) => [r.id, { ...r }]))
  const s: ProfileStore = {
    async getProfile(id) {
      return rows.get(id) ?? null
    },
    async createProfile(row) {
      rows.set(row.id, row)
      return row
    },
    async setVerifiedEmail(id, verified) {
      const r = rows.get(id)!
      r.verifiedEmail = verified
      return r
    },
  }
  return { s, rows }
}

describe('createMyProfile', () => {
  it('creates a tidy profile with the badge taken from Cognito', async () => {
    const { s, rows } = store()
    const p = await createMyProfile(s, { name: '  Meera   Joshi ', areaId: 'arera-colony' }, 'sub-1', true)
    expect(p).toMatchObject({ id: 'sub-1', userId: 'sub-1', name: 'Meera Joshi', areaId: 'arera-colony', verifiedEmail: true })
    expect(rows.size).toBe(1)
  })

  it('is safe to call twice', async () => {
    const { s, rows } = store()
    await createMyProfile(s, { name: 'Meera', areaId: 'arera-colony' }, 'sub-1', true)
    const again = await createMyProfile(s, { name: 'Someone Else', areaId: 'mp-nagar' }, 'sub-1', true)
    expect(again.name).toBe('Meera')
    expect(rows.size).toBe(1)
  })

  it('turns the badge on for older profiles once the email is verified', async () => {
    const { s } = store([{ id: 'sub-2', userId: 'sub-2', name: 'Priya', areaId: 'mp-nagar', verifiedEmail: null }])
    expect((await createMyProfile(s, { name: 'x', areaId: 'x' }, 'sub-2', true)).verifiedEmail).toBe(true)
  })

  it('validates name and area on the server', async () => {
    const { s } = store()
    await expect(createMyProfile(s, { name: 'M', areaId: 'arera-colony' }, 'sub-3', true)).rejects.toThrow(/name/)
    await expect(createMyProfile(s, { name: 'Meera', areaId: 'connaught-place' }, 'sub-3', true)).rejects.toThrow(/area/)
  })
})
