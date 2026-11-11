/**
 * Phone number checks. The number is used once, to send a code by SMS; what's
 * stored is only a keyed fingerprint (HMAC with a server-side secret), so one
 * number can't verify many accounts and the number itself can't be read back.
 */
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { normaliseIndianMobile, OTP, otpMessage } from '../../../shared/phone'
import { RuleError } from './bookings'

/** One per account: the verified number's fingerprint, any pending code (hashed) and the send counters. */
export interface PhoneCheck {
  userId: string
  /** Fingerprint of the checked number; null until one is confirmed. */
  verifiedHash: string | null
  /** Fingerprint of the number a code was last sent to. */
  pendingHash: string | null
  codeHash: string | null
  expiresAt: string | null
  attempts: number
  sendDay: string
  sendsToday: number
  lastSentAt: string | null
}

export interface PhoneStore {
  getCheck(userId: string): Promise<PhoneCheck | null>
  putCheck(c: PhoneCheck): Promise<void>
  deleteCheck(userId: string): Promise<void>
  /** Who verified this number, if anyone. */
  getClaim(phoneHash: string): Promise<string | null>
  /** Records that this account verified the number. Throws ClaimTaken if someone else has it. */
  claim(phoneHash: string, userId: string): Promise<void>
  releaseClaim(phoneHash: string): Promise<void>
  /** Codes sent to this number today (across all accounts), for abuse limits. */
  sendsToNumberToday(phoneHash: string, day: string): Promise<number>
  countSendToNumber(phoneHash: string, day: string): Promise<void>
  setProfilePhoneVerified(userId: string, verified: boolean): Promise<void>
}

export class ClaimTaken extends Error {}

export interface SmsSender {
  /** 'off' while SMS isn't set up (production before DLT); 'test' sends nothing and uses TEST_CODE. */
  mode: 'off' | 'test' | 'sns'
  send(e164: string, text: string): Promise<void>
}

/** The fixed code in test mode (sandboxes only, where no SMS is sent). */
export const TEST_CODE = '246810'

export const fingerprint = (secret: string, e164: string) => createHmac('sha256', secret).update(`phone:${e164}`).digest('hex')
const codeHash = (secret: string, userId: string, code: string) => createHmac('sha256', secret).update(`code:${userId}:${code}`).digest('hex')

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

const dayOf = (iso: string) => iso.slice(0, 10)

export interface Ctx {
  store: PhoneStore
  sms: SmsSender
  secret: string
  now: Date
}

export async function phoneStatus({ store, sms }: Pick<Ctx, 'store' | 'sms'>, userId: string): Promise<{ available: boolean; verified: boolean }> {
  const c = await store.getCheck(userId)
  return { available: sms.mode !== 'off', verified: Boolean(c?.verifiedHash) }
}

/** Sends a code to the number. */
export async function startPhoneCheck({ store, sms, secret, now }: Ctx, userId: string, rawPhone: string): Promise<{ sentTo: string; resendInSeconds: number }> {
  if (sms.mode === 'off') throw new RuleError('Phone checks aren’t switched on yet. We’ll let you know when they are.')
  const phone = normaliseIndianMobile(rawPhone ?? '')
  if (!phone) throw new RuleError('Enter a 10-digit Indian mobile number, e.g. 98765 43210.')
  const hash = fingerprint(secret, phone)
  const owner = await store.getClaim(hash)
  if (owner && owner !== userId) throw new RuleError('That number is already checked on another RentiGoo account.')

  const today = dayOf(now.toISOString())
  const prev = await store.getCheck(userId)
  if (prev?.verifiedHash === hash) throw new RuleError('That number is already checked on your account.')
  const sendsToday = prev && prev.sendDay === today ? prev.sendsToday : 0
  if (prev?.lastSentAt && now.getTime() - Date.parse(prev.lastSentAt) < OTP.resendSeconds * 1000) {
    throw new RuleError(`Please wait a minute before asking for another code.`)
  }
  if (sendsToday >= OTP.maxSendsPerDay) throw new RuleError('That’s the most codes we can send today. Please try again tomorrow.')
  if ((await store.sendsToNumberToday(hash, today)) >= OTP.maxSendsPerDay) throw new RuleError('That number has had too many codes today. Please try again tomorrow.')

  const code = sms.mode === 'test' ? TEST_CODE : String(randomInt(0, 10 ** OTP.length)).padStart(OTP.length, '0')
  await store.putCheck({
    userId,
    // A checked number stays checked until a new one is confirmed.
    verifiedHash: prev?.verifiedHash ?? null,
    pendingHash: hash,
    codeHash: codeHash(secret, userId, code),
    expiresAt: new Date(now.getTime() + OTP.validMinutes * 60_000).toISOString(),
    attempts: 0,
    sendDay: today,
    sendsToday: sendsToday + 1,
    lastSentAt: now.toISOString(),
  })
  await store.countSendToNumber(hash, today)
  if (sms.mode === 'sns') await sms.send(phone, otpMessage(code))
  return { sentTo: phone, resendInSeconds: OTP.resendSeconds }
}

/** Checks the code; on success the account gets the "Phone number checked" badge. */
export async function confirmPhoneCheck({ store, secret, now }: Omit<Ctx, 'sms'>, userId: string, rawCode: string): Promise<{ verified: true }> {
  const c = await store.getCheck(userId)
  if (!c || !c.codeHash || !c.expiresAt || !c.pendingHash) throw new RuleError('Ask for a code first.')
  if (Date.parse(c.expiresAt) < now.getTime()) throw new RuleError('That code has expired. Ask for a new one.')
  if (c.attempts >= OTP.maxAttempts) throw new RuleError('Too many wrong tries. Ask for a new code.')
  const code = (rawCode ?? '').replace(/\D/g, '')
  if (code.length !== OTP.length || !sameHash(codeHash(secret, userId, code), c.codeHash)) {
    await store.putCheck({ ...c, attempts: c.attempts + 1 })
    const left = OTP.maxAttempts - c.attempts - 1
    throw new RuleError(left > 0 ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That code isn’t right. Ask for a new one.')
  }
  try {
    await store.claim(c.pendingHash, userId)
  } catch (e) {
    if (e instanceof ClaimTaken) throw new RuleError('That number is already checked on another RentiGoo account.')
    throw e
  }
  // A different number checked before is released.
  if (c.verifiedHash && c.verifiedHash !== c.pendingHash) await store.releaseClaim(c.verifiedHash)
  await store.putCheck({ ...c, verifiedHash: c.pendingHash, pendingHash: null, codeHash: null, expiresAt: null, attempts: 0 })
  await store.setProfilePhoneVerified(userId, true)
  return { verified: true }
}

/** Removes the check: the badge goes, and the number is free to use on another account. */
export async function forgetPhone({ store }: Pick<Ctx, 'store'>, userId: string): Promise<{ verified: false }> {
  const c = await store.getCheck(userId)
  if (c) {
    if (c.verifiedHash && (await store.getClaim(c.verifiedHash)) === userId) await store.releaseClaim(c.verifiedHash)
    await store.deleteCheck(userId)
  }
  await store.setProfilePhoneVerified(userId, false)
  return { verified: false }
}
