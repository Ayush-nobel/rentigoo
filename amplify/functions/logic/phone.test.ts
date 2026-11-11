import { describe, expect, it } from 'vitest'
import { ClaimTaken, confirmPhoneCheck, fingerprint, forgetPhone, phoneStatus, startPhoneCheck, TEST_CODE, type PhoneCheck, type PhoneStore, type SmsSender } from './phone'

const SECRET = 'test-secret'
function setup(mode: SmsSender['mode'] = 'sns') {
  const checks = new Map<string, PhoneCheck>()
  const claims = new Map<string, string>()
  const perNumber = new Map<string, number>()
  const profile = new Map<string, boolean>()
  const sent: { to: string; text: string }[] = []
  const store: PhoneStore = {
    async getCheck(u) { return structuredClone(checks.get(u) ?? null) },
    async putCheck(c) { checks.set(c.userId, structuredClone(c)) },
    async deleteCheck(u) { checks.delete(u) },
    async getClaim(h) { return claims.get(h) ?? null },
    async claim(h, u) { const o = claims.get(h); if (o && o !== u) throw new ClaimTaken(); claims.set(h, u) },
    async releaseClaim(h) { claims.delete(h) },
    async sendsToNumberToday(h, d) { return perNumber.get(`${h}:${d}`) ?? 0 },
    async countSendToNumber(h, d) { perNumber.set(`${h}:${d}`, (perNumber.get(`${h}:${d}`) ?? 0) + 1) },
    async setProfilePhoneVerified(u, v) { profile.set(u, v) },
  }
  const sms: SmsSender = { mode, async send(to, text) { sent.push({ to, text }) } }
  let t = Date.parse('2026-11-11T10:00:00Z')
  const ctx = () => ({ store, sms, secret: SECRET, now: new Date(t) })
  const later = (s: number) => { t += s * 1000 }
  return { store, checks, claims, profile, sent, ctx, later }
}
const codeIn = (text: string) => text.slice(0, 6)

describe('phone checks', () => {
  it('sends a code, and the right code verifies the number', async () => {
    const s = setup()
    const r = await startPhoneCheck(s.ctx(), 'ananya', '98765 43210')
    expect(r.sentTo).toBe('+919876543210')
    expect(s.sent[0]!.to).toBe('+919876543210')
    expect(s.sent[0]!.text).toMatch(/^\d{6} is your RentiGoo verification code/)
    await confirmPhoneCheck(s.ctx(), 'ananya', codeIn(s.sent[0]!.text))
    expect(s.profile.get('ananya')).toBe(true)
    expect(await phoneStatus(s.ctx(), 'ananya')).toEqual({ available: true, verified: true })
  })

  it('keeps only a keyed fingerprint, never the number or the code', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    const stored = JSON.stringify([...s.checks.values(), ...s.claims.entries()])
    expect(stored).not.toContain('9876543210')
    expect(stored).not.toContain(codeIn(s.sent[0]!.text))
    expect(s.checks.get('ananya')!.pendingHash).toBe(fingerprint(SECRET, '+919876543210'))
    expect(fingerprint('other-secret', '+919876543210')).not.toBe(fingerprint(SECRET, '+919876543210'))
  })

  it('wrong codes count down, then the code stops working', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    const right = codeIn(s.sent[0]!.text)
    const wrong = right === '000000' ? '111111' : '000000'
    await expect(confirmPhoneCheck(s.ctx(), 'ananya', wrong)).rejects.toThrow(/4 tries left/)
    for (let i = 0; i < 3; i++) await expect(confirmPhoneCheck(s.ctx(), 'ananya', wrong)).rejects.toThrow(/isn’t right/)
    await expect(confirmPhoneCheck(s.ctx(), 'ananya', wrong)).rejects.toThrow(/Ask for a new one/)
    await expect(confirmPhoneCheck(s.ctx(), 'ananya', right)).rejects.toThrow(/Too many wrong tries/)
  })

  it('codes expire after 10 minutes', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    s.later(11 * 60)
    await expect(confirmPhoneCheck(s.ctx(), 'ananya', codeIn(s.sent[0]!.text))).rejects.toThrow(/expired/)
  })

  it('limits resends: once a minute, five a day per account and per number', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    await expect(startPhoneCheck(s.ctx(), 'ananya', '9876543210')).rejects.toThrow(/wait a minute/)
    for (let i = 0; i < 4; i++) { s.later(61); await startPhoneCheck(s.ctx(), 'ananya', '9876543210') }
    s.later(61)
    await expect(startPhoneCheck(s.ctx(), 'ananya', '9876543210')).rejects.toThrow(/most codes we can send today/)
    // Someone else can't be used to spam the same number either.
    await expect(startPhoneCheck(s.ctx(), 'vikram', '9876543210')).rejects.toThrow(/too many codes today/)
  })

  it('one number, one account; removing it frees the number', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    await confirmPhoneCheck(s.ctx(), 'ananya', codeIn(s.sent[0]!.text))
    await expect(startPhoneCheck(s.ctx(), 'vikram', '9876543210')).rejects.toThrow(/another RentiGoo account/)
    await forgetPhone(s.ctx(), 'ananya')
    expect(s.profile.get('ananya')).toBe(false)
    await startPhoneCheck(s.ctx(), 'vikram', '9876543210')
  })

  it('changing to a new number keeps the old one until the new one is confirmed', async () => {
    const s = setup()
    await startPhoneCheck(s.ctx(), 'ananya', '9876543210')
    await confirmPhoneCheck(s.ctx(), 'ananya', codeIn(s.sent[0]!.text))
    s.later(61)
    await startPhoneCheck(s.ctx(), 'ananya', '9123456780')
    expect((await phoneStatus(s.ctx(), 'ananya')).verified).toBe(true)
    await confirmPhoneCheck(s.ctx(), 'ananya', codeIn(s.sent[1]!.text))
    expect([...s.claims.values()]).toEqual(['ananya'])
    expect(s.claims.has(fingerprint(SECRET, '+919123456780'))).toBe(true)
  })

  it('off: refuses politely and sends nothing; test mode uses a fixed code and sends nothing', async () => {
    const off = setup('off')
    await expect(startPhoneCheck(off.ctx(), 'ananya', '9876543210')).rejects.toThrow(/aren’t switched on yet/)
    expect(await phoneStatus(off.ctx(), 'ananya')).toEqual({ available: false, verified: false })
    const test = setup('test')
    await startPhoneCheck(test.ctx(), 'ananya', '9876543210')
    expect(test.sent).toEqual([])
    await confirmPhoneCheck(test.ctx(), 'ananya', TEST_CODE)
    expect(test.profile.get('ananya')).toBe(true)
  })

  it('refuses numbers that aren’t Indian mobiles', async () => {
    const s = setup()
    await expect(startPhoneCheck(s.ctx(), 'ananya', '12345')).rejects.toThrow(/10-digit Indian mobile/)
  })
})
