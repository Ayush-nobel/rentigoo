/**
 * ID checks through DigiLocker (see shared/idCheck.ts). Off until the provider
 * keys are set; sandboxes use a test provider that never contacts DigiLocker.
 */
import { createHmac } from 'node:crypto'
import { namesMatch } from '../../../shared/idCheck'
import { RuleError } from './bookings'

/** What the provider tells us after the person consents. Only these fields are read. */
export interface IdResult {
  name: string
  dateOfBirth: string
  /** e.g. "xxxxxxxx1234" */
  maskedNumber: string
}

export interface IdProvider {
  mode: 'off' | 'test' | 'setu'
  /** Starts a DigiLocker request; the person is sent to `url`, then back to `redirectUrl`. */
  start(redirectUrl: string): Promise<{ requestId: string; url: string }>
  /** The Aadhaar details, once the person has consented; null if they haven't (yet). */
  result(requestId: string): Promise<IdResult | null>
  /** Ends our access to their DigiLocker as soon as we've read what we need. */
  revoke(requestId: string): Promise<void>
}

export interface IdCheck {
  userId: string
  pendingRequestId: string | null
  /** Fingerprint of the checked ID; null until checked. */
  verifiedHash: string | null
  verifiedAt: string | null
}

export interface IdStore {
  getProfileName(userId: string): Promise<string | null>
  getCheck(userId: string): Promise<IdCheck | null>
  putCheck(c: IdCheck): Promise<void>
  deleteCheck(userId: string): Promise<void>
  getClaim(hash: string): Promise<string | null>
  /** Throws IdClaimTaken if another account has it. */
  claim(hash: string, userId: string): Promise<void>
  releaseClaim(hash: string): Promise<void>
  setProfileIdVerified(userId: string, verified: boolean): Promise<void>
}

export class IdClaimTaken extends Error {}

export interface Ctx {
  store: IdStore
  provider: IdProvider
  secret: string
  /** Where people may be sent back to after DigiLocker (our own site only). */
  allowedReturn: (url: string) => boolean
  now: Date
}

const fingerprint = (secret: string, r: IdResult) =>
  createHmac('sha256', secret).update(`id:${r.name.trim().toLowerCase()}|${r.dateOfBirth}|${r.maskedNumber.slice(-4)}`).digest('hex')

export async function idCheckStatus({ store, provider }: Pick<Ctx, 'store' | 'provider'>, userId: string) {
  const c = await store.getCheck(userId)
  return { available: provider.mode !== 'off', verified: Boolean(c?.verifiedHash) }
}

export async function startIdCheck({ store, provider, allowedReturn }: Pick<Ctx, 'store' | 'provider' | 'allowedReturn'>, userId: string, returnUrl: string) {
  if (provider.mode === 'off') throw new RuleError('ID checks aren’t switched on yet.')
  if (!allowedReturn(returnUrl)) throw new RuleError('Something went wrong. Please try again.')
  const prev = await store.getCheck(userId)
  if (prev?.verifiedHash) throw new RuleError('Your ID is already checked.')
  const { requestId, url } = await provider.start(returnUrl)
  await store.putCheck({ userId, pendingRequestId: requestId, verifiedHash: null, verifiedAt: null })
  return { url }
}

/** After DigiLocker sends the person back: read the result, check the name, give the badge. */
export async function finishIdCheck({ store, provider, secret, now }: Omit<Ctx, 'allowedReturn'>, userId: string, requestId: string): Promise<{ available: true; verified: true }> {
  const c = await store.getCheck(userId)
  if (!c || !c.pendingRequestId || c.pendingRequestId !== requestId) throw new RuleError('That ID check wasn’t started from your account. Please start again.')
  const result = await provider.result(requestId).catch((e: unknown) => {
    if (e instanceof RuleError) throw e
    throw new RuleError('DigiLocker didn’t send your details. Please try again.')
  })
  // Whatever happens next, we stop reading their DigiLocker now.
  await provider.revoke(requestId).catch(() => undefined)
  await store.putCheck({ ...c, pendingRequestId: null })
  if (!result) throw new RuleError('DigiLocker didn’t confirm your consent. Please try again.')

  const profileName = (await store.getProfileName(userId)) ?? ''
  if (!namesMatch(profileName, result.name)) {
    throw new RuleError('The name on your ID doesn’t match your profile name. Change your name in Account to match your ID, then try again.')
  }
  const hash = fingerprint(secret, result)
  try {
    await store.claim(hash, userId)
  } catch (e) {
    if (e instanceof IdClaimTaken) throw new RuleError('This ID is already checked on another RentiGoo account.')
    throw e
  }
  await store.putCheck({ userId, pendingRequestId: null, verifiedHash: hash, verifiedAt: now.toISOString() })
  await store.setProfileIdVerified(userId, true)
  return { available: true, verified: true }
}

/** Removes the badge, and frees the ID for another account. */
export async function forgetIdCheck({ store }: Pick<Ctx, 'store'>, userId: string): Promise<{ available: true; verified: false }> {
  const c = await store.getCheck(userId)
  if (c?.verifiedHash && (await store.getClaim(c.verifiedHash)) === userId) await store.releaseClaim(c.verifiedHash)
  if (c) await store.deleteCheck(userId)
  await store.setProfileIdVerified(userId, false)
  return { available: true, verified: false }
}

/** Setu's DigiLocker API (docs.setu.co/data/digilocker). */
export function setuProvider(cfg: { baseUrl: string; clientId: string; clientSecret: string; productInstanceId: string }): IdProvider {
  const headers = { 'content-type': 'application/json', 'x-client-id': cfg.clientId, 'x-client-secret': cfg.clientSecret, 'x-product-instance-id': cfg.productInstanceId }
  const call = async (method: 'GET' | 'POST', path: string, body?: object) => {
    const res = await fetch(`${cfg.baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      if (JSON.stringify(json).includes('aadhaar_not_linked')) throw new RuleError('Your Aadhaar isn’t linked to a mobile number, so DigiLocker can’t share it. Link it, then try again.')
      throw new Error(`Setu ${method} ${path}: ${res.status}`)
    }
    return json
  }
  return {
    mode: 'setu',
    async start(redirectUrl) {
      const r = await call('POST', '/api/digilocker/', { redirectUrl })
      return { requestId: String(r.id), url: String(r.url) }
    },
    async result(requestId) {
      const status = await call('GET', `/api/digilocker/${encodeURIComponent(requestId)}/status`)
      if (status.status !== 'authenticated') return null
      const a = (await call('GET', `/api/digilocker/${encodeURIComponent(requestId)}/aadhaar`)).aadhaar as Record<string, unknown> | undefined
      if (!a?.name || !a.maskedNumber) return null
      return { name: String(a.name), dateOfBirth: String(a.dateOfBirth ?? ''), maskedNumber: String(a.maskedNumber) }
    },
    async revoke(requestId) {
      await call('GET', `/api/digilocker/${encodeURIComponent(requestId)}/revoke`)
    },
  }
}

/** Sandboxes: no DigiLocker. "Consent" succeeds at once with the profile's own name. */
export function testProvider(profileName: () => Promise<string>, userId: string): IdProvider {
  return {
    mode: 'test',
    async start(redirectUrl) {
      const requestId = `test-${userId}-${Date.now()}`
      const u = new URL(redirectUrl)
      u.searchParams.set('success', 'True')
      u.searchParams.set('id', requestId)
      return { requestId, url: u.toString() }
    },
    async result() {
      return { name: await profileName(), dateOfBirth: '1990-01-01', maskedNumber: `xxxxxxxx${userId.replace(/\D/g, '').slice(-4).padStart(4, '0')}` }
    },
    async revoke() {},
  }
}

export const offProvider: IdProvider = {
  mode: 'off',
  start: () => Promise.reject(new RuleError('ID checks aren’t switched on yet.')),
  result: () => Promise.resolve(null),
  revoke: () => Promise.resolve(),
}
