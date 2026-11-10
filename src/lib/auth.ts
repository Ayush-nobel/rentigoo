import {
  autoSignIn,
  fetchUserAttributes,
  confirmResetPassword,
  confirmSignUp,
  getCurrentUser,
  resendSignUpCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { DEMO_USER_ID } from '@/data/users'
import { readJSON, readString, writeJSON, writeString } from './storage'

/** What to do after a sign-in or sign-up call. */
export type AuthNext = 'done' | 'confirm-email' | 'reset-password'

export interface AuthService {
  currentUserId(): Promise<string | null>
  currentEmail(): Promise<string | null>
  signIn(email: string, password: string): Promise<AuthNext>
  /** Starts sign-up and emails a code. */
  signUp(email: string, password: string): Promise<AuthNext>
  /** Confirms the emailed code. Returns 'done' if it also signed the person in. */
  confirmEmail(email: string, code: string): Promise<'done' | 'sign-in'>
  resendCode(email: string): Promise<void>
  startPasswordReset(email: string): Promise<void>
  finishPasswordReset(email: string, code: string, newPassword: string): Promise<void>
  signOut(): Promise<void>
  /** Called when the session changes elsewhere (signed out in another tab, token expired). */
  onChange(cb: () => void): () => void
}

/** Messages written for people, not stack traces. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const norm = (email: string) => email.trim().toLowerCase()

function friendly(e: unknown): AuthError {
  const name = (e as { name?: string })?.name ?? ''
  const msg: Record<string, string> = {
    // Same message for both, so nobody can find out which emails have accounts.
    NotAuthorizedException: 'That email and password don’t match. Check them, or reset your password.',
    UserNotFoundException: 'That email and password don’t match. Check them, or reset your password.',
    UsernameExistsException: 'There’s already an account with that email. Log in instead, or reset your password.',
    CodeMismatchException: 'That code isn’t right. Check the latest email from us and try again.',
    ExpiredCodeException: 'That code has expired. We’ve sent you a new one.',
    LimitExceededException: 'Too many tries in a row. Wait a few minutes and try again.',
    TooManyRequestsException: 'Too many tries in a row. Wait a few minutes and try again.',
    TooManyFailedAttemptsException: 'Too many wrong tries. Wait a few minutes and try again.',
    InvalidPasswordException: 'That password doesn’t meet the rules below.',
    InvalidParameterException: 'Something in the form isn’t quite right. Check each field and try again.',
    NetworkError: 'You seem to be offline. Check your connection and try again.',
  }
  return new AuthError(msg[name] ?? 'Something went wrong. Please try again.')
}

async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    throw e instanceof AuthError ? e : friendly(e)
  }
}

// ---------------------------------------------------------------- Cognito
export const cognitoAuth: AuthService = {
  async currentUserId() {
    try {
      return (await getCurrentUser()).userId
    } catch {
      return null
    }
  },

  async currentEmail() {
    try {
      return (await fetchUserAttributes()).email ?? null
    } catch {
      return null
    }
  },

  signIn: (email, password) =>
    guard(async () => {
      // A stale half-session can block sign-in; clear it first.
      await signOut().catch(() => {})
      const r = await signIn({ username: norm(email), password })
      if (r.isSignedIn || r.nextStep.signInStep === 'DONE') return 'done'
      if (r.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        await resendSignUpCode({ username: norm(email) }).catch(() => {})
        return 'confirm-email'
      }
      if (r.nextStep.signInStep === 'RESET_PASSWORD') return 'reset-password'
      throw new AuthError('This account needs an extra step we don’t support yet. Contact us and we’ll sort it out.')
    }),

  signUp: (email, password) =>
    guard(async () => {
      const r = await signUp({ username: norm(email), password, options: { userAttributes: { email: norm(email) }, autoSignIn: true } })
      return r.isSignUpComplete && r.nextStep.signUpStep === 'DONE' ? 'done' : 'confirm-email'
    }),

  confirmEmail: (email, code) =>
    guard(async () => {
      try {
        const r = await confirmSignUp({ username: norm(email), confirmationCode: code.trim() })
        if (r.nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
          const s = await autoSignIn()
          return s.isSignedIn ? 'done' : 'sign-in'
        }
        return 'sign-in'
      } catch (e) {
        if ((e as { name?: string }).name === 'ExpiredCodeException') await resendSignUpCode({ username: norm(email) }).catch(() => {})
        // Auto sign-in only works in the tab that started sign-up.
        if ((e as { name?: string }).name === 'AutoSignInException') return 'sign-in'
        throw e
      }
    }),

  resendCode: (email) => guard(async () => void (await resendSignUpCode({ username: norm(email) }))),

  startPasswordReset: (email) =>
    guard(async () => {
      try {
        await resetPassword({ username: norm(email) })
      } catch (e) {
        // Don't reveal whether the email has an account.
        if ((e as { name?: string }).name === 'UserNotFoundException') return
        throw e
      }
    }),

  finishPasswordReset: (email, code, newPassword) =>
    guard(async () => void (await confirmResetPassword({ username: norm(email), confirmationCode: code.trim(), newPassword }))),

  signOut: () => guard(() => signOut()),

  onChange(cb) {
    return Hub.listen('auth', ({ payload }) => {
      if (['signedIn', 'signedOut', 'tokenRefresh_failure'].includes(payload.event)) cb()
    })
  },
}

// ---------------------------------------------------------------- Demo mode
// Accounts live in this browser only. Any 6-digit code confirms an email, and
// the demo account (ananya.demo@example.com) accepts any password.
interface MockAccount {
  userId: string
  password: string
  confirmed: boolean
}
const ACCOUNTS = 'mock-accounts'
const SESSION = 'session-user'
const DEMO_EMAIL = 'ananya.demo@example.com'
const listeners = new Set<() => void>()
const accounts = () => readJSON<Record<string, MockAccount>>(ACCOUNTS, {})
const pause = () => new Promise((r) => setTimeout(r, 250))

export const mockAuth: AuthService = {
  async currentUserId() {
    return readString(SESSION)
  },
  async currentEmail() {
    const id = readString(SESSION)
    if (id === DEMO_USER_ID) return DEMO_EMAIL
    return Object.entries(accounts()).find(([, a]) => a.userId === id)?.[0] ?? null
  },
  async signIn(email, password) {
    await pause()
    if (norm(email) === DEMO_EMAIL) {
      writeString(SESSION, DEMO_USER_ID)
      return 'done'
    }
    const a = accounts()[norm(email)]
    if (!a || a.password !== password) throw new AuthError('That email and password don’t match. Check them, or reset your password.')
    if (!a.confirmed) return 'confirm-email'
    writeString(SESSION, a.userId)
    return 'done'
  },
  async signUp(email, password) {
    await pause()
    const all = accounts()
    if (all[norm(email)] || norm(email) === DEMO_EMAIL) throw new AuthError('There’s already an account with that email. Log in instead, or reset your password.')
    all[norm(email)] = { userId: `u-${crypto.randomUUID().slice(0, 8)}`, password, confirmed: false }
    writeJSON(ACCOUNTS, all)
    return 'confirm-email'
  },
  async confirmEmail(email, code) {
    await pause()
    if (!/^\d{6}$/.test(code.trim())) throw new AuthError('That code isn’t right. Check the latest email from us and try again.')
    const all = accounts()
    const a = all[norm(email)]
    if (!a) return 'sign-in'
    a.confirmed = true
    writeJSON(ACCOUNTS, all)
    writeString(SESSION, a.userId)
    return 'done'
  },
  async resendCode() {
    await pause()
  },
  async startPasswordReset() {
    await pause()
  },
  async finishPasswordReset(email, code, newPassword) {
    await pause()
    if (!/^\d{6}$/.test(code.trim())) throw new AuthError('That code isn’t right. Check the latest email from us and try again.')
    const all = accounts()
    if (all[norm(email)]) {
      all[norm(email)]!.password = newPassword
      writeJSON(ACCOUNTS, all)
    }
  },
  async signOut() {
    writeString(SESSION, null)
    listeners.forEach((l) => l())
  },
  onChange(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}

/** Only allow redirects back into this site (no //evil.example or https://…). */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}
