import { describe, expect, it } from 'vitest'
import { finishIdCheck, forgetIdCheck, IdClaimTaken, idCheckStatus, offProvider, startIdCheck, type IdCheck, type IdProvider, type IdStore } from './idCheck'

const NOW = new Date('2026-11-18T10:00:00Z')
const allowedReturn = (u: string) => u.startsWith('https://www.rentigoo.in/')

function setup(names: Record<string, string>, idName = 'AYUSH KUMAR SHUKLA') {
  const checks = new Map<string, IdCheck>()
  const claims = new Map<string, string>()
  const badges = new Map<string, boolean>()
  const revoked: string[] = []
  const store: IdStore = {
    async getProfileName(id) {
      return names[id] ?? null
    },
    async getCheck(id) {
      return checks.get(id) ?? null
    },
    async putCheck(c) {
      checks.set(c.userId, c)
    },
    async deleteCheck(id) {
      checks.delete(id)
    },
    async getClaim(h) {
      return claims.get(h) ?? null
    },
    async claim(h, id) {
      const owner = claims.get(h)
      if (owner && owner !== id) throw new IdClaimTaken()
      claims.set(h, id)
    },
    async releaseClaim(h) {
      claims.delete(h)
    },
    async setProfileIdVerified(id, v) {
      badges.set(id, v)
    },
  }
  let n = 0
  const provider: IdProvider = {
    mode: 'setu',
    async start() {
      n++
      return { requestId: `req-${n}`, url: `https://digilocker.example/consent/${n}` }
    },
    async result() {
      return { name: idName, dateOfBirth: '1994-05-02', maskedNumber: 'xxxxxxxx4321' }
    },
    async revoke(id) {
      revoked.push(id)
    },
  }
  const ctx = { store, provider, secret: 'pepper', allowedReturn, now: NOW }
  return { ctx, badges, revoked, checks }
}
const back = 'https://www.rentigoo.in/account/id-check'

describe('ID checks', () => {
  it('gives the badge when the name matches, keeping no ID details, and revokes access', async () => {
    const s = setup({ u1: 'Ayush Shukla' })
    expect(await startIdCheck(s.ctx, 'u1', back)).toEqual({ url: 'https://digilocker.example/consent/1' })
    await finishIdCheck(s.ctx, 'u1', 'req-1')
    expect(s.badges.get('u1')).toBe(true)
    expect(s.revoked).toEqual(['req-1'])
    const stored = JSON.stringify(s.checks.get('u1'))
    expect(stored).not.toMatch(/AYUSH|1994|4321/)
    expect(await idCheckStatus(s.ctx, 'u1')).toEqual({ available: true, verified: true })
  })

  it('refuses a name that doesn’t match, and still revokes access', async () => {
    const s = setup({ u1: 'Ramesh Shukla' })
    await startIdCheck(s.ctx, 'u1', back)
    await expect(finishIdCheck(s.ctx, 'u1', 'req-1')).rejects.toThrow(/doesn’t match your profile name/)
    expect(s.badges.get('u1')).toBeUndefined()
    expect(s.revoked).toEqual(['req-1'])
  })

  it('one ID checks one account; removing the check frees it', async () => {
    const s = setup({ u1: 'Ayush Shukla', u2: 'Ayush Shukla' })
    await startIdCheck(s.ctx, 'u1', back)
    await finishIdCheck(s.ctx, 'u1', 'req-1')
    await startIdCheck(s.ctx, 'u2', back)
    await expect(finishIdCheck(s.ctx, 'u2', 'req-2')).rejects.toThrow(/another RentiGoo account/)
    await forgetIdCheck(s.ctx, 'u1')
    await startIdCheck(s.ctx, 'u2', back)
    await finishIdCheck(s.ctx, 'u2', 'req-3')
    expect(s.badges.get('u2')).toBe(true)
  })

  it('refuses someone else’s request, outside return addresses, and when switched off', async () => {
    const s = setup({ u1: 'Ayush Shukla', u2: 'Meera Joshi' })
    await startIdCheck(s.ctx, 'u1', back)
    await expect(finishIdCheck(s.ctx, 'u2', 'req-1')).rejects.toThrow(/wasn’t started from your account/)
    await expect(startIdCheck(s.ctx, 'u1', 'https://evil.example/')).rejects.toThrow()
    await expect(startIdCheck({ ...s.ctx, provider: offProvider }, 'u1', back)).rejects.toThrow(/aren’t switched on/)
    expect(await idCheckStatus({ ...s.ctx, provider: offProvider }, 'u1')).toEqual({ available: false, verified: false })
  })
})
